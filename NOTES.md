# Backend notes

Things learned from `sociair-new-backend-v11` that are easy to get wrong. Not needed to use the
server — read this before changing how it talks to the API.

- List filtering uses a JSON-encoded `filters` query param: `filters={"search":"SC-TASK-2026-5612"}`.
  A bare `?search=` is ignored by the backend.
- Attachments and the activity timeline are Master-module endpoints keyed by
  `model_type=TASK&model_id=<id>`.
- Boards come from `crm/grouped-pipelines` (a nested group tree plus `standalone_pipelines`);
  stages from `crm/pipeline-stages` filtered with `filters={"crm_pipeline_id":<id>}`.
- Stage moves go to `master/kanban/change-kanban-stage` with `{model, model_id, column, column_id}`,
  where `model` is the fully-qualified Eloquent class (the card detail returns it as
  `eloquent_model`) and `column` is `crm_pipeline_stage_id` or `crm_pipeline_id`.
- `crm/task/{id}/set-status` is **not** the board column — it flips the subtask status between
  PENDING and COMPLETED.
- `crm/discussions/get-task-conversation` creates an empty conversation row for the card if none
  exists, so it is not in the default `get_card` bundle.
- `crm/my-tasks` sits behind `permission:view-crm-my-tasks`; a 403 there while other tools work is
  a role gap, not an expired token.

## Writing

- `create_card` POSTs `crm/task`. `CrudController::store` does `$request->only($fields)` where the
  fields come from `CrmTask::getFields()` — so **only** title, description, priority, severity,
  mst_project_id, mst_dynamic_form(_fields), taskable_type/_id and custom_fields survive. Anything
  else (a `due_date`, for instance) is silently dropped; due dates have to be set by a later edit.
- The board and stage do **not** come through that filter. They arrive via `CrmTask::mergeRequest()`,
  which reads `crm_pipeline['id']` and `crm_pipeline_stage['id']` — so they must be sent as
  **objects**, not bare ids. `crm_pipeline_stage` is `required_with:crm_pipeline`.
- `afterCreateProcess()` is what applies `members`, `tags`, `mst_project_id` and `crm_task_category_id`,
  and it forces `owned_by` to the authenticated user. It runs inside the store transaction, so a
  failure there rolls the card back rather than leaving a half-made one.
- The Activity/Topic is a dynamic form (`mst_dynamic_form_id`), listed at
  `hris/dynamic-forms/dropdown` and searchable with `filters={"search":"bug"}`. It is nullable in the
  DB, but the web create form refuses to show the title field until one is picked, so a card without
  it looks half-filled. Bug topics carry no fields of their own — "Actual Result" and "Expected
  Result" are a convention inside the description HTML, not form fields.
- Descriptions are TipTap HTML. The house bug layout is a summary paragraph, then
  `<p><strong>Steps to Reproduce:</strong></p><ol>…</ol>`, then `<p><strong>Actual Result:</strong><br>…</p>`
  and the same for Expected Result.

- `move_card` uses `master/kanban/change-kanban-stage`, the same endpoint the board's
  drag-and-drop calls, so the backend's guards still apply: it refuses a move into a `COMPLETED`
  stage while the card has incomplete subtasks, and wants a `lost_reason` for a `LOST` stage.
- A stage move also flips `subtask_status` via `kanbanExecuteAfterChange` — moving out of a
  COMPLETED stage marks the card pending, moving back marks it complete.
- Do **not** move a card by POSTing `crm/task/{id}` instead. That path runs
  `CrmTask::mergeRequest()`, which does `priority = request('priority') ?? 1`, so an update that
  omits priority silently resets the card to Low.
- `CrudController::update` is `$request->only($fields)` then `$model->update()` — a merge, so
  fields you don't send are left alone.
