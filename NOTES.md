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
