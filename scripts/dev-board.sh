#!/usr/bin/env bash
#
# dev-board.sh -- start the offline board on the Pi's own screen, cleanly.
#
#   bash scripts/dev-board.sh            # fullscreen, F11 or Alt+F4 gets you out
#   bash scripts/dev-board.sh --kiosk    # true kiosk: NO way out except SSH
#   bash scripts/dev-board.sh --stop     # kill the server and the browser
#
# Why this exists: relaunching by hand leaves the previous server holding port 8137
# (EADDRINUSE) and the previous Chromium holding the screen with no way out. Both
# happened on the first try. This tears down before it brings up.
#
# Deliberately defaults to --start-fullscreen rather than --kiosk. Kiosk mode has no
# exit, which is correct for the finished appliance -- where a GPIO button handles it
# (docs/architecture.md) -- and wrong for a development loop.

set -uo pipefail

PORT="${CHESSBOB_OFFLINE_PORT:-8137}"
URL="http://127.0.0.1:${PORT}/offline/"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

stop_everything() {
  # Match only our own processes; never a broad `pkill chromium` that would take out
  # a browser the user is doing something else in.
  pkill -f "node .*${REPO}/offline/serve.mjs" 2>/dev/null
  pkill -f "node .*offline/serve.mjs" 2>/dev/null
  pkill -f "chromium.*${PORT}" 2>/dev/null
  sleep 1
}

if [ "${1:-}" = "--stop" ]; then
  stop_everything
  echo "stopped."
  exit 0
fi

CHROME_MODE="--start-fullscreen"
[ "${1:-}" = "--kiosk" ] && CHROME_MODE="--kiosk"

echo "Tearing down anything already running..."
stop_everything

# Anything still on the port is not ours -- say so rather than failing obscurely.
if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -q ":${PORT} "; then
  echo "ERROR: port ${PORT} is still in use by something this script did not start." >&2
  echo "       Find it with:  ss -ltnp | grep ${PORT}" >&2
  exit 1
fi

echo "Starting the board server on ${URL}"
node "${REPO}/offline/serve.mjs" &
SERVER_PID=$!

# Wait for it to actually listen rather than sleeping and hoping.
for _ in $(seq 1 40); do
  if command -v curl >/dev/null 2>&1 && curl -sf -o /dev/null "${URL}"; then break; fi
  sleep 0.25
done

if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "ERROR: the server exited immediately. Run it directly to see why:" >&2
  echo "       node ${REPO}/offline/serve.mjs" >&2
  exit 1
fi

# Launching a Wayland client from an SSH session needs both of these; without them
# Chromium cannot find the compositor and dies with a display error.
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"

echo "Launching Chromium (${CHROME_MODE})"
chromium \
  --ozone-platform=wayland \
  "${CHROME_MODE}" \
  --app="${URL}" \
  >/dev/null 2>&1 &

cat <<EOF

Board is up: ${URL}

  Exit the browser   $( [ "$CHROME_MODE" = "--kiosk" ] \
      && echo "KIOSK MODE -- no way out on the panel. From SSH: bash scripts/dev-board.sh --stop" \
      || echo "F11 leaves fullscreen, Alt+F4 closes it" )
  Stop everything    bash scripts/dev-board.sh --stop

The server keeps running in this shell. Ctrl+C stops it but leaves Chromium up;
use --stop to clear both.
EOF

wait "$SERVER_PID"
