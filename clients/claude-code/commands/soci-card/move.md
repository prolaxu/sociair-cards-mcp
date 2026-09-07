---
description: Move a Sociair CRM card to another board stage (e.g. In Progress, Ready To Test)
argument-hint: <task number> <target stage>
allowed-tools: mcp__sociair-cards__move_card, mcp__sociair-cards__get_card, mcp__sociair-cards__get_board_stages, mcp__sociair-cards__list_boards
---

Move a card between stages. Arguments: `$ARGUMENTS` — the first token is the task number
(`SC-TASK-...` or a numeric id); everything after it is the target stage name.

1. If no stage was given, call `mcp__sociair-cards__get_board_stages` with that `card` and show me the
   stages on its board with the current one marked, then stop and ask which one.
2. Otherwise call `mcp__sociair-cards__move_card` with `card` and `stage`. Stage names are resolved
   against the card's own board, so pass the name as I wrote it — do not guess an id.
3. Report the move as `<from stage> → <to stage>` on `<board>`.

If the move is refused, relay the backend's reason rather than retrying:

- A stage list back means the name didn't match — show me the real names and ask.
- "Complete all subtasks before moving to completed stage" means the card has open subtasks.
- A `LOST` stage needs a `lost_reason`; ask me for one instead of inventing it.
- "Writes are disabled" means `SOCIAIR_ALLOW_WRITES=1` is not set in the server's `.env`.

Moving a card into a `COMPLETED` stage also flips its completion state. This is a real change to
shared data, so move exactly the card I named and nothing else.
