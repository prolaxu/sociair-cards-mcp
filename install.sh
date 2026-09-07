#!/usr/bin/env bash
# Installs sociair-cards-mcp into whichever editors are on this machine.
# Safe to re-run: every step is idempotent.
set -euo pipefail

# --------------------------------------------------------------- bootstrap
# Works two ways:
#   git clone … && ./install.sh
#   curl -fsSL <raw-url>/install.sh | bash
# When piped there is no checkout yet, so clone (or update) one and re-exec.
REPO=${SOCIAIR_REPO:-https://github.com/prolaxu/sociair-cards-mcp.git}
DEST=${SOCIAIR_HOME:-$HOME/.sociair-cards-mcp}

ROOT=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)

if [ -z "${ROOT:-}" ] || [ ! -f "$ROOT/server.mjs" ]; then
  command -v git >/dev/null 2>&1 || { echo "git is required to install. Install git, then re-run." >&2; exit 1; }
  if [ -d "$DEST/.git" ]; then
    printf '\033[1mUpdating\033[0m %s\n' "$DEST"
    git -C "$DEST" pull --ff-only --quiet || echo "  ! could not fast-forward; using the checkout as-is" >&2
  else
    printf '\033[1mCloning\033[0m %s -> %s\n' "$REPO" "$DEST"
    git clone --quiet --depth 1 "$REPO" "$DEST"
  fi
  exec bash "$DEST/install.sh" "$@"
fi

. "$ROOT/bin/_find-node.sh"

LAUNCHER="$ROOT/bin/sociair-cards-mcp"
SERVER_ID="sociair-cards"
CURSOR_JSON="$HOME/.cursor/mcp.json"
CLAUDE_COMMANDS="$HOME/.claude/commands/soci-card"
CURSOR_SKILLS="$HOME/.cursor/skills"

TOKEN="" ; DO_CLAUDE=auto ; DO_CURSOR=auto ; UNINSTALL=0 ; WRITES="" ; CONFIGURED=""

while [ $# -gt 0 ]; do
  case "$1" in
    --token) TOKEN="${2:-}"; shift 2 ;;
    --token=*) TOKEN="${1#*=}"; shift ;;
    --writes) WRITES=1; shift ;;
    --no-writes) WRITES=0; shift ;;
    --no-claude) DO_CLAUDE=0; shift ;;
    --no-cursor) DO_CURSOR=0; shift ;;
    --uninstall) UNINSTALL=1; shift ;;
    -h|--help)
      cat <<'USAGE'
Usage: ./install.sh [options]

  --token <t>    Save this bearer token (otherwise you are prompted if none is set)
  --writes       Enable move_card / add_card_comment (default: read-only)
  --no-claude    Skip Claude Code
  --no-cursor    Skip Cursor
  --uninstall    Remove the registrations and commands (leaves this directory and .env)
USAGE
      exit 0 ;;
    *) echo "unknown option: $1 (try --help)" >&2; exit 2 ;;
  esac
done

say()  { printf '  %s\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
head_() { printf '\n\033[1m%s\033[0m\n' "$*"; }

# ---------------------------------------------------------------- uninstall
if [ "$UNINSTALL" = 1 ]; then
  head_ "Uninstalling $SERVER_ID"
  command -v claude >/dev/null 2>&1 && claude mcp remove "$SERVER_ID" -s user >/dev/null 2>&1 && ok "removed from Claude Code" || true
  rm -rf "$CLAUDE_COMMANDS" && ok "removed Claude Code commands"
  if [ -d "$CURSOR_SKILLS" ]; then
    for skill in "$ROOT"/clients/cursor/skills/*/; do
      rm -rf "${CURSOR_SKILLS:?}/$(basename "$skill")"
    done
    ok "removed Cursor skills"
  fi
  if [ -f "$CURSOR_JSON" ] && NODE=$(find_node) && [ -n "$NODE" ]; then
    "$NODE" -e '
      const fs=require("fs"), f=process.argv[1];
      const j=JSON.parse(fs.readFileSync(f,"utf8"));
      if (j.mcpServers) delete j.mcpServers[process.argv[2]];
      fs.writeFileSync(f, JSON.stringify(j,null,2)+"\n");
    ' "$CURSOR_JSON" "$SERVER_ID" && ok "removed from Cursor"
  fi
  say "The checkout at $ROOT and your .env were left alone."
  exit 0
fi

# ---------------------------------------------------------------- node
head_ "Checking Node"
NODE=$(find_node)
if [ -z "$NODE" ]; then
  echo "  Node >= 18 is required but was not found. Install it, then re-run." >&2
  exit 1
fi
NODE_MAJOR=$("$NODE" -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "  Node >= 18 required, found $("$NODE" -v) at $NODE" >&2
  exit 1
fi
ok "$("$NODE" -v) at $NODE"
chmod +x "$LAUNCHER" "$ROOT/server.mjs" 2>/dev/null || true

# ---------------------------------------------------------------- .env
head_ "Credentials"
[ -f "$ROOT/.env" ] || { cp "$ROOT/.env.example" "$ROOT/.env"; ok "created .env from .env.example"; }
chmod 600 "$ROOT/.env"

current_token=$(sed -n 's/^SOCIAIR_TOKEN=//p' "$ROOT/.env" | head -1)
if [ -z "$TOKEN" ] && { [ -z "$current_token" ] || [ "$current_token" = "paste-your-bearer-token-here" ]; }; then
  if [ -t 0 ]; then
    say "Get a token: DevTools -> Network -> any XHR to the Sociair API -> Authorization header."
    printf '  Paste the bearer token (input hidden, Enter to skip): '
    read -rs TOKEN || TOKEN=""
    printf '\n'
  else
    warn "no token set — run ./install.sh --token <t>, or /soci-card:set-token later"
  fi
fi

set_env_key() { # key value
  "$NODE" -e '
    const fs=require("fs"), [f,k,v]=process.argv.slice(1);
    let s=fs.existsSync(f)?fs.readFileSync(f,"utf8"):"";
    const re=new RegExp("^\\s*"+k+"\\s*=.*$","m");
    s = re.test(s) ? s.replace(re, k+"="+v) : s.replace(/\n*$/,"\n")+k+"="+v+"\n";
    fs.writeFileSync(f,s,{mode:0o600});
  ' "$ROOT/.env" "$1" "$2"
}

if [ -n "$TOKEN" ]; then
  TOKEN=${TOKEN#Bearer }
  set_env_key SOCIAIR_TOKEN "$TOKEN"
  ok "token saved to .env (chmod 600)"
elif [ -n "$current_token" ] && [ "$current_token" != "paste-your-bearer-token-here" ]; then
  ok "using the token already in .env"
fi

if [ -n "$WRITES" ]; then
  set_env_key SOCIAIR_ALLOW_WRITES "$WRITES"
  [ "$WRITES" = 1 ] && ok "writes enabled (move_card, add_card_comment)" || ok "writes disabled"
fi

# ---------------------------------------------------------------- claude code
head_ "Claude Code"
if [ "$DO_CLAUDE" != 0 ] && command -v claude >/dev/null 2>&1; then
  claude mcp remove "$SERVER_ID" -s user >/dev/null 2>&1 || true
  if claude mcp add "$SERVER_ID" -s user -- "$LAUNCHER" >/dev/null 2>&1; then
    ok "registered '$SERVER_ID' (user scope — every project)"
  else
    warn "could not register automatically; run: claude mcp add $SERVER_ID -s user -- $LAUNCHER"
  fi
  mkdir -p "$(dirname "$CLAUDE_COMMANDS")"
  rm -rf "$CLAUDE_COMMANDS"
  cp -r "$ROOT/clients/claude-code/commands/soci-card" "$CLAUDE_COMMANDS"
  ok "installed /soci-card:read :move :boards :comment :set-token"
  CONFIGURED="Claude Code"
elif [ "$DO_CLAUDE" = 0 ]; then
  say "skipped (--no-claude)"
else
  say "the 'claude' CLI is not on PATH — skipped"
fi

# ---------------------------------------------------------------- cursor
head_ "Cursor"
if [ "$DO_CURSOR" != 0 ]; then
  mkdir -p "$(dirname "$CURSOR_JSON")"
  # Merge into any existing config rather than overwriting it.
  "$NODE" -e '
    const fs=require("fs"), [f,id,cmd]=process.argv.slice(1);
    let j={};
    if (fs.existsSync(f)) {
      try { j=JSON.parse(fs.readFileSync(f,"utf8")); }
      catch { fs.copyFileSync(f, f+".bak"); console.error("  ! existing mcp.json was invalid JSON; backed up to "+f+".bak"); }
    }
    j.mcpServers = j.mcpServers || {};
    j.mcpServers[id] = { command: cmd };
    fs.writeFileSync(f, JSON.stringify(j,null,2)+"\n");
  ' "$CURSOR_JSON" "$SERVER_ID" "$LAUNCHER"
  ok "registered in $CURSOR_JSON (other servers left untouched)"
  # Cursor reads user skills from ~/.cursor/skills (its own built-ins live in
  # ~/.cursor/skills-cursor, which it syncs — never write there).
  mkdir -p "$CURSOR_SKILLS"
  for skill in "$ROOT"/clients/cursor/skills/*/; do
    name=$(basename "$skill")
    rm -rf "${CURSOR_SKILLS:?}/$name"
    cp -r "$skill" "$CURSOR_SKILLS/$name"
  done
  ok "installed /soci-card-read -move -boards -comment -set-token"
  CONFIGURED="${CONFIGURED:+$CONFIGURED and }Cursor"
  say "optional per-repo rule: cp $ROOT/clients/cursor/rules/*.mdc <your-repo>/.cursor/rules/"
else
  say "skipped (--no-cursor)"
fi

# ---------------------------------------------------------------- verify
head_ "Verifying"
result=$(printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"check_token","arguments":{}}}' \
  | "$LAUNCHER" 2>/dev/null | "$NODE" -e '
    let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
      let tools=0, auth=null;
      for (const line of s.split("\n").filter(Boolean)) {
        const m=JSON.parse(line);
        if (m.id===2) tools=m.result.tools.length;
        if (m.id===3) auth=JSON.parse(m.result.content[0].text);
      }
      console.log(JSON.stringify({tools, ok:auth?.ok, reason:auth?.reason, boards:auth?.boards_visible, writes:auth?.writes_enabled}));
    });')

"$NODE" -e '
  const r=JSON.parse(process.argv[1]);
  const g=s=>"  \x1b[32m✓\x1b[0m "+s, w=s=>"  \x1b[33m!\x1b[0m "+s;
  console.log(g(r.tools+" tools responding"));
  if (r.ok) console.log(g("token works — "+r.boards+" boards visible"));
  else console.log(w("token not working: "+(r.reason||"unknown")));
  console.log(g("writes "+(r.writes?"ENABLED":"disabled (read-only)")));
' "$result"

head_ "Done"
say "Installed at $ROOT"
if [ -n "$CONFIGURED" ]; then
  say "Restart $CONFIGURED to pick up the server."
  say "Then try:  /soci-card:read SC-TASK-2026-6850"
else
  say "No editor was configured. Re-run without --no-claude / --no-cursor to register one."
fi
