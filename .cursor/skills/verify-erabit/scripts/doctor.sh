#!/usr/bin/env bash
# Read-only: is the launched instance ours, current, and drivable? Exits non-zero on the first hard problem.
set -uo pipefail
source "$(dirname "$0")/env.sh"

fail() { echo "DOCTOR FAIL: $*" >&2; exit 1; }
ok() { echo "ok  $*"; }

pidfile="$ERABIT_RUN_DIR/server.pid"
[ -f "$pidfile" ] || fail "no instance launched from this run dir ($ERABIT_RUN_DIR); run launch.sh"
pid="$(cat "$pidfile")"
kill -0 "$pid" 2>/dev/null || fail "pid $pid from $pidfile is not running; run cleanup.sh then launch.sh"
ok "server pid $pid alive"

owner="$(port_owner "$ERABIT_PORT")"
[ "$owner" = "$pid" ] || fail "port $ERABIT_PORT is owned by pid '${owner:-unknown}', not our pid $pid"
ok "port $ERABIT_PORT owned by our pid"

served="$(curl -sf --max-time 3 "$ERABIT_URL")" || fail "$ERABIT_URL did not return 200"
[ "$served" = "$(cat "$REPO/dist/index.html")" ] || fail "served index.html differs from dist/index.html (rebuilt elsewhere?)"
ok "serves dist/index.html at $ERABIT_URL"

head_rev="$(git -C "$REPO" rev-parse HEAD)"
built_rev="$(cat "$ERABIT_RUN_DIR/build.rev")"
if [ "$head_rev" != "$built_rev" ] || [ "$(git -C "$REPO" status --porcelain -- . ':!.cursor')" != "$(cat "$ERABIT_RUN_DIR/build.dirty")" ]; then
  fail "checkout changed since launch (built ${built_rev:0:7}, HEAD ${head_rev:0:7}); run cleanup.sh then launch.sh"
fi
ok "build matches checkout ${head_rev:0:7}"

[ -d "$ERABIT_TOOLS_DIR/node_modules/playwright-core" ] || fail "playwright-core missing; run setup-tools.sh"
[ -n "$(find_chrome)" ] || fail "no Chrome/Chromium; run setup-tools.sh"
ok "harness: playwright-core + $(find_chrome)"

"$(dirname "$0")/drive" smoke --viewport 375x812 --quiet || fail "smoke drive failed (title did not render with logo and Ella)"
ok "title renders with logo and Ella in a fresh browser profile"
echo "doctor: instance is worth driving"
