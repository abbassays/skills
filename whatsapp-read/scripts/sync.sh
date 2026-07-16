#!/bin/bash
# Sync WhatsApp messages on demand: start the bridge, wait until the message
# database goes quiet (sync complete), then stop the bridge.
# Prints progress to stderr, final status line to stdout.
#
# Install location of whatsapp-mcp is resolved from (in order):
#   1. $WHATSAPP_MCP_DIR
#   2. install_dir file next to this script (written during setup)
#   3. common defaults: ~/dev/whatsapp-mcp, ~/whatsapp-mcp

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

resolve_root() {
  if [ -n "${WHATSAPP_MCP_DIR:-}" ]; then echo "$WHATSAPP_MCP_DIR"; return; fi
  if [ -f "$SCRIPT_DIR/install_dir" ]; then cat "$SCRIPT_DIR/install_dir"; return; fi
  for d in "$HOME/dev/whatsapp-mcp" "$HOME/whatsapp-mcp"; do
    [ -d "$d/whatsapp-bridge" ] && { echo "$d"; return; }
  done
  echo ""
}

ROOT="$(resolve_root)"
[ -n "$ROOT" ] && [ -d "$ROOT/whatsapp-bridge" ] || {
  echo "ERROR: whatsapp-mcp install not found. Run the setup in SKILL.md first, or set WHATSAPP_MCP_DIR."
  exit 1
}

BRIDGE_DIR="$ROOT/whatsapp-bridge"
BRIDGE_BIN="$BRIDGE_DIR/whatsapp-bridge-bin"
DB="$BRIDGE_DIR/store/messages.db"
PORT="${WHATSAPP_BRIDGE_PORT:-8080}"
QUIET_SECS=15      # DB unchanged for this long => sync considered complete
MAX_WAIT=180       # hard cap on total runtime (seconds)

db_stamp() { stat -f "%m %z" "$DB" 2>/dev/null || stat -c "%Y %s" "$DB" 2>/dev/null || echo "none"; }
port_busy() { lsof -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; }

# If a bridge is already running (user started it manually), don't start or
# kill anything — just wait for a quiet period and leave it running.
if port_busy; then
  echo "Bridge already running; waiting for DB to go quiet (not stopping it)..." >&2
  last=$(db_stamp); quiet=0; elapsed=0
  while [ $quiet -lt $QUIET_SECS ] && [ $elapsed -lt $MAX_WAIT ]; do
    sleep 3; elapsed=$((elapsed+3))
    now=$(db_stamp)
    if [ "$now" = "$last" ]; then quiet=$((quiet+3)); else quiet=0; last=$now; fi
  done
  echo "SYNCED (bridge left running, managed elsewhere)"
  exit 0
fi

[ -x "$BRIDGE_BIN" ] || { echo "ERROR: bridge binary missing at $BRIDGE_BIN (run: cd $BRIDGE_DIR && go build -o whatsapp-bridge-bin .)"; exit 1; }

cd "$BRIDGE_DIR" || exit 1
LOG="${TMPDIR:-/tmp}/whatsapp-bridge-sync.log"
"$BRIDGE_BIN" >"$LOG" 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null; wait $PID 2>/dev/null' EXIT

echo "Bridge started (pid $PID); waiting for connection..." >&2

# Wait for the API to come up (proves the client initialized)
up=0
for i in $(seq 1 20); do
  if port_busy; then up=1; break; fi
  if ! kill -0 $PID 2>/dev/null; then break; fi
  sleep 1
done
if [ $up -ne 1 ]; then
  echo "ERROR: bridge failed to start. Last log lines:"
  tail -5 "$LOG"
  exit 1
fi

# Needs re-pairing? (QR prompt means the session expired)
sleep 3
if grep -q "Scan this QR" "$LOG" 2>/dev/null; then
  echo "ERROR: session expired — the bridge needs a new QR pairing. Run it manually: cd $BRIDGE_DIR && ./whatsapp-bridge-bin"
  exit 2
fi

echo "Connected; syncing until DB is quiet for ${QUIET_SECS}s..." >&2
last=$(db_stamp); quiet=0; elapsed=0
while [ $quiet -lt $QUIET_SECS ] && [ $elapsed -lt $MAX_WAIT ]; do
  sleep 3; elapsed=$((elapsed+3))
  now=$(db_stamp)
  if [ "$now" = "$last" ]; then quiet=$((quiet+3)); else quiet=0; last=$now; fi
done

msgs=$(sqlite3 "file:$DB?mode=ro" "SELECT COUNT(*) FROM messages" 2>/dev/null || echo "?")
echo "SYNCED in ${elapsed}s — $msgs messages in DB. Bridge stopped."
