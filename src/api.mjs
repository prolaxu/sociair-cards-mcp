import { ApiError, CONFIG, ENV_FILE, SERVER_NAME, SERVER_VERSION, requireWrites } from "./config.mjs";

function headers() {
  return {
    Authorization: `Bearer ${CONFIG.token}`,
    // The backend resolves the tenant from the request origin
    // (InitializeTenancyByOrigin) — without these it 500s.
    Origin: CONFIG.origin,
    Referer: CONFIG.origin.replace(/\/?$/, "/"),
    "X-Selected-Fiscal-Year-Id": CONFIG.fiscalYearId,
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json, text/plain, */*",
    "User-Agent": `${SERVER_NAME}/${SERVER_VERSION}`,
  };
}

function requireToken() {
  if (!CONFIG.token) {
    throw new ApiError(
      `SOCIAIR_TOKEN is not set. Put a fresh bearer token in ${ENV_FILE}, or run /soci-card:set-token.`,
    );
  }
}

async function send(url, init) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), CONFIG.timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } catch (err) {
    throw new ApiError(`${init.method || "GET"} ${url.pathname} failed: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

function parse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function apiGet(endpoint, params = {}) {
  requireToken();
  const url = new URL(CONFIG.base + "/" + String(endpoint).replace(/^\/+/, ""));
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }

  const res = await send(url, { headers: headers() });
  const text = await res.text();

  if (res.status === 401 || res.status === 403) {
    throw new ApiError(
      `HTTP ${res.status} from ${url.pathname}. Either SOCIAIR_TOKEN is expired (refresh it with ` +
        "/soci-card:set-token) or this account cannot access that endpoint. If other tools still work, " +
        "it is a permission problem, not the token.",
    );
  }
  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status} from ${url.pathname}: ${text.slice(0, 400)}`);
  }
  return parse(text);
}

export async function apiPost(endpoint, body = {}) {
  requireWrites();
  requireToken();
  const url = new URL(CONFIG.base + "/" + String(endpoint).replace(/^\/+/, ""));

  const res = await send(url, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const parsed = parse(text);

  if (res.status === 401 || res.status === 403) {
    throw new ApiError(
      `HTTP ${res.status} from ${url.pathname}. Either SOCIAIR_TOKEN is expired or this account ` +
        "lacks permission for that action.",
    );
  }
  if (!res.ok) {
    // 422s carry the useful message (e.g. "Complete all subtasks before moving to completed stage.")
    throw new ApiError(`HTTP ${res.status} from ${url.pathname}: ${parsed?.message || text.slice(0, 400)}`);
  }
  return parsed;
}
