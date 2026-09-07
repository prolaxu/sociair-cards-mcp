---
description: Post a comment onto a Sociair CRM card's activity timeline
argument-hint: <task number> <comment text>
allowed-tools: mcp__sociair-cards__add_card_comment, mcp__sociair-cards__get_card
---

Post a comment on a card. Arguments: `$ARGUMENTS` — the first token is the task number, the rest
is the comment body.

1. If only a task number was given with no body, ask me what to say. Do not compose a comment on
   my behalf and post it without showing me first.
2. Show me the exact text you are about to post, then call `mcp__sociair-cards__add_card_comment` with
   `card` and `comment`.
3. Confirm it posted.

The comment is written as me and is visible to everyone on the card, and there is no tool to
delete it afterwards — so post once, and post exactly what I approved. If the server reports
"Writes are disabled", tell me to set `SOCIAIR_ALLOW_WRITES=1` rather than trying another route.
