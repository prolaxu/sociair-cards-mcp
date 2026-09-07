import { ApiError } from "./config.mjs";
import { callTool } from "./tools/index.mjs";

// No static resources, but a template so clients with resource pickers (Cursor's
// @-mentions) can pull a card straight into context: soci-card://SC-TASK-2026-5612
export const RESOURCE_TEMPLATES = [
  {
    uriTemplate: "soci-card://{card}",
    name: "sociair_card",
    title: "Sociair CRM card",
    description:
      "One card as JSON (detail, subtasks, attachments, timeline, time entries). " +
      "`card` is a task number such as SC-TASK-2026-5612, or a numeric task id.",
    mimeType: "application/json",
  },
];

export async function readResource(uri) {
  const m = /^soci-card:\/\/(.+)$/.exec(String(uri || ""));
  if (!m) throw new ApiError(`Unsupported resource URI: ${uri}. Expected soci-card://<task-number>.`);
  const result = await callTool("get_card", { card: decodeURIComponent(m[1]) });
  return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(result, null, 2) }] };
}
