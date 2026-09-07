import { apiGet } from "../api.mjs";

export const sociairApiGet = {
  name: "sociair_api_get",
  description:
    "Escape hatch: issue an arbitrary authenticated GET against the Sociair API (read-only). " +
    "Path is relative to the API base, e.g. 'crm/tasks/status' or 'crm/task/7577/subtasks'.",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "API path relative to the base, without a leading slash." },
      query: { type: "object", description: "Query parameters. Objects are JSON-encoded.", additionalProperties: true },
    },
    required: ["path"],
    additionalProperties: false,
  },
  run: (args) => apiGet(args.path, args.query || {}),
};
