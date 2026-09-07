---
description: Save a fresh Sociair bearer token so the MCP server can authenticate again
argument-hint: <bearer token, or nothing to just check the current one>
allowed-tools: mcp__sociair-cards__set_token, mcp__sociair-cards__check_token
---

`$ARGUMENTS`

- **If I gave you a token above**, call `mcp__sociair-cards__set_token` with it. The tool strips a leading
  `Bearer `, verifies the token against the API, and only then writes it to the server's
  `.env`. It takes effect immediately — no restart. Report whether it worked and how many
  boards are visible.
- **If I gave you nothing**, call `mcp__sociair-cards__check_token` and tell me whether the current token
  still works, then remind me how to get a new one:

  > DevTools → Network → any XHR to `new-central-api.sociair.com` → copy the
  > `Authorization: Bearer …` header.

If the token is rejected, say so plainly — `.env` is left untouched in that case, so the old
token is still in place.

A token is a credential: don't echo it back in full, don't write it anywhere except through the
`set_token` tool, and note that it is now in this conversation's transcript.
