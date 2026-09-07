---
name: soci-card-create
description: Create a Sociair CRM card on a specific board — bug cards get Actual Result and Expected Result.
---
# Create a Sociair card

Take the board and what the card is about from the user's message.

1. **Board** — pass the name as written; it resolves server-side, so never guess an id. If none
   was given, call `list_boards` and ask which one.
2. **Stage** — leave it off unless one was asked for; the card then lands on the board's first
   column. `get_board_stages` lists them.
3. **Title** — one line, specific, the observable problem or the deliverable. Max 255 characters.
4. **A bug needs all four content fields**, none skipped:
   - `description` — what is broken, where, on which environment.
   - `steps_to_reproduce` — an array, one step per entry.
   - `actual_result` — what actually happens now.
   - `expected_result` — what should happen instead.
   A feature or chore needs only `description`.
5. **Activity** — `Bug Reporting` for a bug, `General Task` otherwise, or whatever the user names.
   The CRM's own form requires one, so a card without it looks half-filled.
6. `priority` (`low`/`medium`/`high`/`critical`) only if the user said so.

Show the title, board, stage and full description text and wait for approval before calling
`create_card`. This creates a card everyone on the board sees, and there is no delete from here.

Then report the task number, board and stage, and offer `get_card_link` for a shareable link.

If refused, relay the reason rather than retrying:

- A board or stage list back means the name didn't match — show the real names and ask.
- "Writes are disabled" — `SOCIAIR_ALLOW_WRITES=1` is not set in the server's `.env`.

The create endpoint ignores a due date; it has to be set in the CRM afterwards.
