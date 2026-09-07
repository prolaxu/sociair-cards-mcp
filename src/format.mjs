import { ApiError } from "./config.mjs";

export function htmlToText(html) {
  if (typeof html !== "string" || !html) return html;
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|li|div|h[1-6]|tr)\s*>/gi, "\n")
    .replace(/<\s*li\s*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Plain text -> the minimal HTML the CRM's comment box produces. */
export function textToHtml(text) {
  const esc = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export const compactCard = (t) => ({
  id: t?.id,
  task_number: t?.task_number,
  title: t?.title,
  pipeline: t?.crm_pipeline?.name ?? t?.pipeline?.name,
  stage: t?.crm_pipeline_stage?.display_name ?? t?.pipeline_stage?.display_name,
  priority: typeof t?.priority === "object" ? t?.priority?.display_name : t?.priority_parsed,
  owner: t?.owned_by?.name,
  members: (t?.members || []).map((m) => m?.label ?? m?.name).filter(Boolean),
  due_date: t?.due_date,
  is_overdue: t?.isOverdue,
  tags: (t?.tags || []).map((x) => x?.name).filter(Boolean),
  comments_count: t?.comments_count,
  attachments_count: t?.attachments_count,
  created_at: t?.created_at_long ?? t?.created_at,
  description: htmlToText(t?.description),
});

export const compactStage = (s) => ({
  id: s?.id,
  name: s?.display_name ?? s?.name,
  internal_name: s?.name,
  // ACTIVE / INACTIVE / COMPLETED — the backend blocks a move to COMPLETED
  // while the card still has incomplete subtasks.
  type: s?.type,
  order: s?.display_order,
  color: s?.color,
  board_id: s?.crm_pipeline_id,
  board: s?.crm_pipeline?.name,
  is_form_required: s?.is_form_required,
  is_assignee_required: s?.is_assignee_required,
});

/** Match "in progress", "In Progress", or an id against a list of {id, name, internal_name}. */
export function matchByName(rows, needle, label) {
  const want = String(needle).trim();
  if (/^\d+$/.test(want)) {
    const byId = rows.find((r) => String(r.id) === want);
    if (byId) return byId;
  }
  const norm = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const target = norm(want);
  const list = (rs) => rs.map((r) => `${r.name} (${r.id})`).join(", ");

  const exact = rows.filter((r) => norm(r.name) === target || norm(r.internal_name) === target);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) throw new ApiError(`"${needle}" matches several ${label}s: ${list(exact)}.`);

  const partial = rows.filter(
    (r) => norm(r.name).includes(target) || norm(r.internal_name).includes(target),
  );
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) throw new ApiError(`"${needle}" is ambiguous — ${label}s matching: ${list(partial)}.`);

  throw new ApiError(`No ${label} matches "${needle}". Available: ${list(rows)}.`);
}
