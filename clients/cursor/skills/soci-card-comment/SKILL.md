---
name: soci-card-comment
description: Post a comment onto a Sociair CRM card's activity timeline.
---
# Comment on a Sociair card

Take the task number and the comment body from the user's message.

1. If only a task number was given, ask what to say. Never compose a comment on their behalf and
   post it without showing them first.
2. Show the exact text you're about to post, then call `add_card_comment` with `card` and
   `comment`.
3. Confirm it posted.

The comment is written as the user, is visible to everyone on the card, and there is no tool to
delete it — post once, and post exactly what was approved. If the server says "Writes are
disabled", say `SOCIAIR_ALLOW_WRITES=1` needs setting rather than trying another route.
