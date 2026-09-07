#!/usr/bin/env node
// sociair-cards-mcp — MCP server over the Sociair CRM task ("card") API.
// Zero dependencies: speaks MCP stdio JSON-RPC directly, uses Node's global fetch.
import { serve } from "./src/mcp.mjs";

serve();
