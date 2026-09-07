import { apiGet, apiPost } from "../api.mjs";
import { ApiError, requireWrites } from "../config.mjs";
import { matchByName } from "../format.mjs";
import { getCardDetail, listBoards, listStages, resolveCardId } from "../crm.mjs";

const CARD_ARG = { type: "string", description: "Task number (SC-TASK-2026-5612) or numeric task id." };

export const listBoardsTool = {
  name: "list_boards",
  description:
    "List the CRM boards (pipelines) and, with include_stages, the stages (columns) on each. " +
    "Use this to discover valid stage names before moving a card.",
  inputSchema: {
    type: "object",
    properties: {
      include_stages: {
        type: "boolean",
        description: "Also fetch each board's stages (default false — one extra request per board).",
      },
      board: { type: "string", description: "Only this board, by name or numeric id. Implies include_stages." },
    },
    required: [],
    additionalProperties: false,
  },
  async run(args) {
    let boards = await listBoards();
    if (args.board) boards = [matchByName(boards, args.board, "board")];
    if (!args.board && !args.include_stages) return { boards };
    const stages = await Promise.all(boards.map((b) => listStages(b.id).catch(() => [])));
    return { boards: boards.map((b, i) => ({ ...b, stages: stages[i] })) };
  },
};

export const getBoardStages = {
  name: "get_board_stages",
  description:
    "List the stages (columns) of one board, in board order — id, name, type (ACTIVE/INACTIVE/COMPLETED) " +
    "and whether the stage requires a form or an assignee. Pass a board, or a card to use that card's board.",
  inputSchema: {
    type: "object",
    properties: {
      board: { type: "string", description: "Board name or numeric pipeline id." },
      card: { type: "string", description: "Task number or id — uses whatever board that card sits on." },
    },
    required: [],
    additionalProperties: false,
  },
  async run(args) {
    let boardId;
    let boardName;
    let currentStageId;
    if (args.board) {
      const hit = matchByName(await listBoards(), args.board, "board");
      boardId = hit.id;
      boardName = hit.name;
    } else if (args.card) {
      const card = await getCardDetail(await resolveCardId(args.card));
      boardId = card?.pipeline?.id;
      boardName = card?.pipeline?.name;
      currentStageId = card?.pipeline_stage?.id;
      if (!boardId) throw new ApiError(`Card ${args.card} has no board attached.`);
    } else {
      throw new ApiError("Pass either `board` or `card`.");
    }
    const stages = await listStages(boardId);
    return {
      board_id: boardId,
      board: boardName,
      ...(currentStageId ? { current_stage_id: currentStageId } : {}),
      stages: currentStageId ? stages.map((s) => ({ ...s, current: s.id === currentStageId })) : stages,
    };
  },
};

export const moveCard = {
  name: "move_card",
  description:
    "WRITE — move a card to a different stage (column), and optionally to a different board. " +
    "Stage may be a name ('In Progress', 'Ready To Test (Stag)') or a stage id; it is resolved against the " +
    "card's own board. Moving board lands the card on that board's first stage. " +
    "Requires SOCIAIR_ALLOW_WRITES=1. The backend refuses a move into a COMPLETED stage while the card " +
    "still has incomplete subtasks.",
  inputSchema: {
    type: "object",
    properties: {
      card: CARD_ARG,
      stage: { type: "string", description: "Target stage: name or numeric stage id." },
      board: {
        type: "string",
        description:
          "Target board (name or pipeline id). Alone, moves the card to that board's first stage; " +
          "combined with `stage`, the stage is resolved on this board.",
      },
      lost_reason: { type: "string", description: "Required by the backend when moving into a LOST stage." },
    },
    required: ["card"],
    additionalProperties: false,
  },
  async run(args) {
    requireWrites(); // fail before spending lookups on a card we cannot move
    if (!args.stage && !args.board) throw new ApiError("Pass `stage`, `board`, or both.");

    const id = await resolveCardId(args.card);
    const card = await getCardDetail(id);
    const from = {
      board: card.pipeline?.name,
      board_id: card.pipeline?.id,
      stage: card.pipeline_stage?.display_name ?? card.pipeline_stage?.name,
      stage_id: card.pipeline_stage?.id,
    };

    // `model` is the fully-qualified Eloquent class; the card detail carries it.
    const model = card.eloquent_model || "Modules\\Crm\\Models\\CrmTask";
    const post = (body) => apiPost("master/kanban/change-kanban-stage", { model, model_id: id, ...body });

    const targetBoard = args.board ? matchByName(await listBoards(), args.board, "board") : null;

    // Board-only move: the backend drops the card on that board's first stage.
    if (targetBoard && !args.stage) {
      const res = await post({ column: "crm_pipeline_id", column_id: targetBoard.id });
      return {
        card_id: id,
        task_number: card.task_number,
        from,
        to: { board: targetBoard.name, board_id: targetBoard.id },
        message: res?.message,
      };
    }

    const boardId = targetBoard ? targetBoard.id : from.board_id;
    if (!boardId) throw new ApiError(`Card ${args.card} has no board, so a stage cannot be resolved.`);
    const stage = matchByName(await listStages(boardId), args.stage, "stage");

    // Changing board and stage at once: move the board first, then the stage.
    if (targetBoard && targetBoard.id !== from.board_id) {
      await post({ column: "crm_pipeline_id", column_id: targetBoard.id });
    }
    const res = await post({
      column: "crm_pipeline_stage_id",
      column_id: stage.id,
      ...(args.lost_reason ? { lost_reason: args.lost_reason } : {}),
    });
    return {
      card_id: id,
      task_number: card.task_number,
      from,
      to: { board: targetBoard?.name ?? from.board, board_id: boardId, stage: stage.name, stage_id: stage.id },
      message: res?.message,
    };
  },
};
