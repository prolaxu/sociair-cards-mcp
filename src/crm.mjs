// Shared lookups against the CRM: resolving a card reference, and reading boards/stages.
import { apiGet } from "./api.mjs";
import { ApiError } from "./config.mjs";
import { compactStage } from "./format.mjs";

/** Accepts a numeric id or a task number like SC-TASK-2026-5612. */
export async function resolveCardId(card) {
  const ref = String(card).trim();
  if (/^\d+$/.test(ref)) return Number(ref);

  const res = await apiGet("crm/task", { filters: { search: ref }, rowsPerPage: 20 });
  const rows = Array.isArray(res?.data) ? res.data : [];
  if (!rows.length) throw new ApiError(`No card matches "${ref}".`);
  const exact = rows.find((r) => String(r?.task_number || "").toLowerCase() === ref.toLowerCase());
  const hit = exact || rows[0];
  if (!hit?.id) throw new ApiError(`Could not resolve an id for "${ref}".`);
  return hit.id;
}

export const getCardDetail = (id) => apiGet(`crm/task/${id}`).then((r) => r?.data ?? {});

/** Flatten the nested group/pipeline tree from crm/grouped-pipelines into board rows. */
function flattenBoards(node, groupPath = []) {
  const out = [];
  for (const p of node?.pipelines || []) {
    out.push({ id: p.id, name: p.name, group: groupPath.join(" / ") || null, pipeline_type: p.pipeline_type });
  }
  for (const g of node?.groups || []) out.push(...flattenBoards(g, [...groupPath, g.name]));
  return out;
}

export async function listBoards() {
  const data = (await apiGet("crm/grouped-pipelines"))?.data ?? {};
  const boards = [];
  for (const g of data.groups || []) boards.push(...flattenBoards(g, [g.name]));
  for (const p of data.standalone_pipelines || []) {
    boards.push({ id: p.id, name: p.name, group: null, pipeline_type: p.pipeline_type });
  }
  return boards;
}

export async function listStages(boardId) {
  const res = await apiGet("crm/pipeline-stages", {
    filters: { crm_pipeline_id: boardId },
    rowsPerPage: 100,
    sortBy: "display_order",
  });
  const rows = Array.isArray(res?.data) ? res.data : [];
  return rows.map(compactStage).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
