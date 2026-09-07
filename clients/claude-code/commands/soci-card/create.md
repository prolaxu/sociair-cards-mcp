---
description: Create a Sociair CRM card on a specific board (bug cards get Actual/Expected Result)
argument-hint: <board> <title, or a description of the bug>
allowed-tools: mcp__sociair-cards__create_card, mcp__sociair-cards__list_boards, mcp__sociair-cards__get_board_stages, mcp__sociair-cards__get_card_link
---

Create a card. Arguments: `$ARGUMENTS` — normally the board, then what the card is about.

1. Work out the **board**. If I named one, pass it through as I wrote it — names resolve
   server-side, so never guess an id. If I didn't, call `mcp__sociair-cards__list_boards` and ask
   which one; don't pick for me.
2. Work out the **stage**. Leave it off unless I asked for one — the card then lands on the
   board's first column, which is where new work belongs. `mcp__sociair-cards__get_board_stages`
   lists them if I want to choose.
3. Write the **title**: one line, specific, the observable problem or the deliverable — not
   "fix bug". Max 255 characters.
4. If it is a **bug**, fill in all four content fields, and do not skip any:
   - `description` — what is broken, where, and on which environment.
   - `steps_to_reproduce` — an array, one step per entry.
   - `actual_result` — what actually happens now.
   - `expected_result` — what should happen instead.
   For a feature or chore, `description` alone is enough.
5. Pass an `activity` (Topic) — `Bug Reporting` for a bug, `General Task` otherwise, or whatever I
   name. The CRM's own form requires one, so a card without it looks half-filled.
6. Set `priority` only if I said so (`low`/`medium`/`high`/`critical`).

**Show me the title, the board, the stage and the full description text, and wait for my go-ahead
before calling `mcp__sociair-cards__create_card`.** This creates a card everyone on the board sees,
and there is no delete from here.

Afterwards, report the task number, the board and the stage, and offer
`mcp__sociair-cards__get_card_link` for a shareable link.

If it is refused, relay the reason rather than retrying:

- A board or stage list back means the name didn't match — show me the real names and ask.
- "Writes are disabled" means `SOCIAIR_ALLOW_WRITES=1` is not set in the server's `.env`.

The create endpoint ignores a due date — if I want one, say so and I'll set it in the CRM.
