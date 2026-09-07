// MCP stdio transport: newline-delimited JSON-RPC on stdin/stdout.
import { SERVER_NAME, SERVER_VERSION, SUPPORTED_PROTOCOLS } from "./config.mjs";
import { TOOLS, callTool } from "./tools/index.mjs";
import { PROMPTS, renderPrompt } from "./prompts.mjs";
import { RESOURCE_TEMPLATES, readResource } from "./resources.mjs";

const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");
const reply = (id, result) => send({ jsonrpc: "2.0", id, result });
const replyError = (id, code, message) => send({ jsonrpc: "2.0", id, error: { code, message } });

async function handle(msg) {
  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;

  switch (method) {
    case "initialize": {
      const asked = params?.protocolVersion;
      reply(id, {
        protocolVersion: SUPPORTED_PROTOCOLS.includes(asked) ? asked : SUPPORTED_PROTOCOLS[0],
        capabilities: {
          tools: { listChanged: false },
          // Cursor probes prompts/ and resources/ on connect; advertising them
          // (rather than answering -32601) keeps it from flagging the server as broken.
          prompts: { listChanged: false },
          resources: { listChanged: false, subscribe: false },
          logging: {},
        },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });
      return;
    }
    case "notifications/initialized":
    case "notifications/cancelled":
    case "notifications/progress":
    case "notifications/roots/list_changed":
      return;
    case "ping":
      reply(id, {});
      return;
    case "tools/list":
      reply(id, { tools: TOOLS });
      return;
    case "tools/call": {
      const name = params?.name;
      try {
        const result = await callTool(name, params?.arguments || {});
        reply(id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
      } catch (err) {
        reply(id, {
          content: [{ type: "text", text: `Error in ${name}: ${err?.message || String(err)}` }],
          isError: true,
        });
      }
      return;
    }
    case "prompts/list":
      reply(id, { prompts: PROMPTS });
      return;
    case "prompts/get":
      try {
        reply(id, renderPrompt(params?.name, params?.arguments || {}));
      } catch (err) {
        replyError(id, -32602, err?.message || String(err));
      }
      return;
    case "resources/list":
      reply(id, { resources: [] });
      return;
    case "resources/templates/list":
      reply(id, { resourceTemplates: RESOURCE_TEMPLATES });
      return;
    case "resources/read":
      try {
        reply(id, await readResource(params?.uri));
      } catch (err) {
        replyError(id, -32602, err?.message || String(err));
      }
      return;
    case "logging/setLevel":
      reply(id, {});
      return;
    case "completion/complete":
      reply(id, { completion: { values: [], total: 0, hasMore: false } });
      return;
    default:
      // Unknown notifications are dropped silently — some clients (Cursor) send
      // extra notifications/* and treat an error reply as a protocol failure.
      if (!isNotification && !String(method).startsWith("notifications/")) {
        replyError(id, -32601, `Method not found: ${method}`);
      }
  }
}

export function serve() {
  let buffer = "";
  let pending = 0;
  let stdinClosed = false;

  /** Exit only once stdin is gone *and* every in-flight request has replied. */
  const maybeExit = () => {
    if (stdinClosed && pending === 0) process.exit(0);
  };

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      pending += 1;
      Promise.resolve(handle(msg))
        .catch((err) => {
          if (msg?.id !== undefined && msg?.id !== null) {
            replyError(msg.id, -32603, err?.message || String(err));
          }
        })
        .finally(() => {
          pending -= 1;
          maybeExit();
        });
    }
  });

  const close = () => {
    stdinClosed = true;
    maybeExit();
  };
  process.stdin.on("end", close);
  process.stdin.on("close", close);
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => process.exit(0));

  // A crashed request must not take the whole server down mid-session.
  process.on("unhandledRejection", (err) => {
    process.stderr.write(`[${SERVER_NAME}] unhandled rejection: ${err?.message || err}\n`);
  });
}
