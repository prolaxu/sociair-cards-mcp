---
name: soci-card-boards
description: Show the Sociair CRM boards and their stages (columns).
---
# Sociair boards and stages

- No argument: `list_boards`, then list the boards with their groups and ids.
- A board name: `list_boards` with `board: "<name>"` to list that board's stages in order.
- A task number or numeric id: `get_board_stages` with `card: "<ref>"` for the stages of the board
  that card sits on. The card's current stage comes back marked `current: true` — point it out.

Keep it to a compact table: stage name, id, type (`ACTIVE` / `INACTIVE` / `COMPLETED`). Flag any
stage requiring a form or an assignee, since moving a card into one can be refused.
