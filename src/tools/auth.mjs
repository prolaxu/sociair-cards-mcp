import fs from "node:fs";
import path from "node:path";
import { apiGet } from "../api.mjs";
import { ApiError, CONFIG, ENV_FILE } from "../config.mjs";

/** Rewrite one key in .env, preserving comments, order and every other key. */
function writeEnvKey(key, value) {
  const line = `${key}=${value}`;
  let body = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf8") : "";
  const re = new RegExp(`^\\s*${key}\\s*=.*$`, "m");
  if (re.test(body)) {
    body = body.replace(re, line);
  } else {
    body = body.replace(/\n*$/, "\n") + line + "\n";
  }
  // Write via a temp file so an interrupted write cannot truncate the real .env.
  const tmp = path.join(path.dirname(ENV_FILE), `.env.tmp-${process.pid}`);
  fs.writeFileSync(tmp, body, { mode: 0o600 });
  fs.renameSync(tmp, ENV_FILE);
  fs.chmodSync(ENV_FILE, 0o600);
}

async function verify() {
  const boards = (await apiGet("crm/grouped-pipelines"))?.data ?? {};
  const count =
    (boards.groups || []).reduce((n, g) => n + (g.pipelines?.length || 0), 0) +
    (boards.standalone_pipelines?.length || 0);
  return count;
}

export const setToken = {
  name: "set_token",
  description:
    "Save a fresh Sociair bearer token to the server's .env and start using it immediately — no restart. " +
    "Get one from the browser: DevTools → Network → any XHR to the API → the Authorization header. " +
    "A leading 'Bearer ' is stripped. The token is verified against the API before it is saved.",
  inputSchema: {
    type: "object",
    properties: {
      token: { type: "string", description: "The bearer token, with or without the 'Bearer ' prefix." },
    },
    required: ["token"],
    additionalProperties: false,
  },
  async run(args) {
    const token = String(args.token ?? "").trim().replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "");
    if (!token) throw new ApiError("`token` is empty.");
    if (token.length < 20 || /\s/.test(token)) {
      throw new ApiError("That does not look like a bearer token (too short, or contains whitespace).");
    }

    const previous = CONFIG.token;
    CONFIG.token = token; // try it before writing it to disk
    let boards;
    try {
      boards = await verify();
    } catch (err) {
      CONFIG.token = previous;
      throw new ApiError(`Token rejected, .env left unchanged: ${err?.message || err}`);
    }

    writeEnvKey("SOCIAIR_TOKEN", token);
    return {
      saved_to: ENV_FILE,
      active_now: true,
      boards_visible: boards,
      note: "Saved and already in use by this server process. Other running clients keep their old token until restarted.",
    };
  },
};

export const checkToken = {
  name: "check_token",
  description:
    "Check whether the configured Sociair token still works, and report what the server is pointed at. " +
    "Use this first when a tool returns 401/403.",
  inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
  async run() {
    const info = {
      env_file: ENV_FILE,
      api_base: CONFIG.base,
      origin: CONFIG.origin,
      token_set: Boolean(CONFIG.token),
      token_preview: CONFIG.token ? `…${CONFIG.token.slice(-6)}` : null,
      writes_enabled: CONFIG.allowWrites,
    };
    if (!CONFIG.token) return { ...info, ok: false, reason: "SOCIAIR_TOKEN is not set. Run set_token." };
    try {
      return { ...info, ok: true, boards_visible: await verify() };
    } catch (err) {
      return { ...info, ok: false, reason: err?.message || String(err) };
    }
  },
};
