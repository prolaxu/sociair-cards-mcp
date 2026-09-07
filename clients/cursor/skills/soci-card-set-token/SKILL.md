---
name: soci-card-set-token
description: Save a fresh Sociair bearer token so the MCP server can authenticate again.
---
# Set the Sociair token

- **Token given**: call `set_token` with it. The tool strips a leading `Bearer `, verifies against
  the API, and only then writes it to the server's `.env`. It takes effect immediately — no
  restart. Report whether it worked and how many boards are visible.
- **No token given**: call `check_token`, say whether the current one still works, and remind them
  how to get a new one:

  > DevTools → Network → any XHR to `new-central-api.sociair.com` → copy the
  > `Authorization: Bearer …` header.

If the token is rejected, say so plainly — `.env` is left untouched, so the old one is still there.

A token is a credential: don't echo it back in full, don't write it anywhere except through the
`set_token` tool, and note that it's now in the conversation transcript.
