---
description: Show the Sociair CRM boards and their stages (columns)
argument-hint: [board name or card number, optional]
allowed-tools: mcp__sociair-cards__list_boards, mcp__sociair-cards__get_board_stages
---

Show me the CRM boards.

- With no argument: call `mcp__sociair-cards__list_boards` and list the boards with their groups and ids.
- With a board name: call `mcp__sociair-cards__list_boards` with `board: "$ARGUMENTS"` and list that
  board's stages in order.
- With a task number (`SC-TASK-...`) or numeric id: call `mcp__sociair-cards__get_board_stages` with
  `card: "$ARGUMENTS"` to show the stages of the board that card sits on. The response marks
  the card's current stage with `current: true` — point it out.

Keep it to a compact table — stage name, id, and type (`ACTIVE` / `INACTIVE` / `COMPLETED`).
Flag any stage that requires a form or an assignee, since moving a card into one can be refused.
