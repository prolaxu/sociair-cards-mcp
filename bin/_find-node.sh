# Sourced by bin/sociair-cards-mcp and install.sh. Defines find_node().
#
# GUI-launched editors (Cursor, VS Code from a desktop icon) do not inherit a
# login shell, so an nvm-managed `node` is not on PATH. Find it the hard way.
find_node() {
  if [ -n "${NODE_BIN:-}" ] && [ -x "${NODE_BIN:-}" ]; then
    echo "${NODE_BIN}"
    return
  fi
  if command -v node >/dev/null 2>&1; then
    command -v node
    return
  fi
  if [ -d "$HOME/.nvm/versions/node" ]; then
    if [ -f "$HOME/.nvm/alias/default" ]; then
      want=$(cat "$HOME/.nvm/alias/default")
      case "$want" in
        v*) [ -x "$HOME/.nvm/versions/node/$want/bin/node" ] && \
              { echo "$HOME/.nvm/versions/node/$want/bin/node"; return; } ;;
      esac
    fi
    newest=$(ls -1 "$HOME/.nvm/versions/node" 2>/dev/null | sort -V | tail -1)
    if [ -n "$newest" ] && [ -x "$HOME/.nvm/versions/node/$newest/bin/node" ]; then
      echo "$HOME/.nvm/versions/node/$newest/bin/node"
      return
    fi
  fi
  for candidate in /usr/local/bin/node /usr/bin/node /opt/homebrew/bin/node /snap/bin/node; do
    [ -x "$candidate" ] && { echo "$candidate"; return; }
  done
}
