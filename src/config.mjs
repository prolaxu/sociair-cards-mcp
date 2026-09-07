import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ENV_FILE = path.join(ROOT, ".env");

export const SERVER_NAME = "sociair-cards-mcp";
export const SERVER_VERSION = "2.0.0";
export const SUPPORTED_PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Anything already in the environment (an MCP config's `env` block) wins.
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

loadEnvFile(ENV_FILE);

// The shipped .env.example placeholder is not a token — treat it as unset so the
// error says "no token" instead of "expired".
const rawToken = (process.env.SOCIAIR_TOKEN || "").trim();

export const CONFIG = {
  base: (process.env.SOCIAIR_API_BASE || "https://new-central-api.sociair.com/api").replace(/\/+$/, ""),
  token: rawToken === "paste-your-bearer-token-here" ? "" : rawToken,
  origin: process.env.SOCIAIR_ORIGIN || "https://onewindow.sociair.io",
  fiscalYearId: process.env.SOCIAIR_FISCAL_YEAR_ID || "4",
  timeoutMs: Number(process.env.SOCIAIR_TIMEOUT_MS || 30000),
  // Writes (move a card, post a comment) are opt-in. Everything else is read-only.
  allowWrites: /^(1|true|yes|on)$/i.test(process.env.SOCIAIR_ALLOW_WRITES || ""),
};

export class ApiError extends Error {}

export function requireWrites() {
  if (!CONFIG.allowWrites) {
    throw new ApiError(
      `Writes are disabled. Set SOCIAIR_ALLOW_WRITES=1 in ${ENV_FILE} (or in the MCP server's ` +
        "env block) and restart the client to allow this tool to change data in the CRM.",
    );
  }
}
