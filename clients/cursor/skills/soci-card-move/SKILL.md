---
name: soci-card-move
description: Move a Sociair CRM card to another board stage (e.g. In Progress, Ready To Test).
---
# Move a Sociair card

Take the task number and the target stage from the user's message.

1. If no stage was given, call `get_board_stages` with that `card`, show the board's stages with
   the current one marked, and ask which.
2. Otherwise call `move_card` with `card` and `stage`. Stage names resolve against the card's own
   board — pass the name as written, never guess an id.
3. Report the move as `<from stage> → <to stage>` on `<board>`.

If refused, relay the reason rather than retrying:

- A stage list back means the name didn't match — show the real names and ask.
- "Complete all subtasks before moving to completed stage" — the card has open subtasks.
- A `LOST` stage needs a `lost_reason`; ask for one instead of inventing it.
- "Writes are disabled" — `SOCIAIR_ALLOW_WRITES=1` is not set in the server's `.env`.

Moving into a `COMPLETED` stage also flips the card's completion state. This changes shared data,
so move exactly the card named and nothing else.
