import { apiPost } from "../api.mjs";
import { ApiError, requireWrites } from "../config.mjs";
import { textToHtml } from "../format.mjs";
import { resolveCardId } from "../crm.mjs";

export const addCardComment = {
  name: "add_card_comment",
  description:
    "WRITE — post a comment onto a card's activity timeline, as the authenticated user. " +
    "Use it to report back what was changed, link a branch or PR, or ask a question on the card. " +
    "Requires SOCIAIR_ALLOW_WRITES=1.",
  inputSchema: {
    type: "object",
    properties: {
      card: { type: "string", description: "Task number (SC-TASK-2026-5612) or numeric task id." },
      comment: { type: "string", description: "Comment body. Plain text unless `html` is true." },
      html: {
        type: "boolean",
        description: "Treat `comment` as HTML instead of plain text (default false). The backend sanitises it either way.",
      },
      mentioned_users: {
        type: "array",
        items: { type: "integer" },
        description: "User ids to @-mention (they get notified).",
      },
    },
    required: ["card", "comment"],
    additionalProperties: false,
  },
  async run(args) {
    requireWrites();
    const body = String(args.comment ?? "").trim();
    if (!body) throw new ApiError("`comment` is empty.");
    const id = await resolveCardId(args.card);
    const res = await apiPost("master/activity-timeline/add-comment", {
      model_type: "TASK",
      model_id: id,
      comment: args.html === true ? body : textToHtml(body),
      ...(args.mentioned_users?.length ? { mentioned_users: args.mentioned_users } : {}),
    });
    return { card_id: id, posted: true, message: res?.message, comment: res?.data ?? null };
  },
};
