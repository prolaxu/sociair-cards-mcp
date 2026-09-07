// The tool registry. Each tool is {name, description, inputSchema, run}; the wire-format
// tool list and the dispatcher are both derived from it, so they cannot drift apart.
import { ApiError } from "../config.mjs";
import * as cards from "./cards.mjs";
import * as boards from "./boards.mjs";
import { addCardComment } from "./comments.mjs";
import { checkToken, setToken } from "./auth.mjs";
import { sociairApiGet } from "./raw.mjs";

const ALL = [
  cards.getCard,
  cards.searchCards,
  cards.listMyCards,
  cards.getCardTimeline,
  cards.getCardConversation,
  cards.getCardLink,
  cards.downloadCardAttachments,
  boards.listBoardsTool,
  boards.getBoardStages,
  boards.moveCard,
  addCardComment,
  setToken,
  checkToken,
  sociairApiGet,
];

const REGISTRY = new Map(ALL.map((t) => [t.name, t]));

/** What tools/list returns — the registry minus the implementations. */
export const TOOLS = ALL.map(({ run, ...schema }) => schema);

export function callTool(name, args = {}) {
  const tool = REGISTRY.get(name);
  if (!tool) {
    throw new ApiError(`Unknown tool: ${name}. Available: ${[...REGISTRY.keys()].join(", ")}.`);
  }
  return tool.run(args);
}
