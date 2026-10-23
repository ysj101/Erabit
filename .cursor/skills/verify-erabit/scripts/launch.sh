#!/usr/bin/env bash
# Builds the current checkout and serves dist/ under /Erabit/ with `vite preview`, exactly as Pages will.
# Prints "ready <url>" once the page, its bundle, and Ella's images are all served.
set -euo pipefail
source "$(dirname "$0")/env.sh"

mkdir -p "$ERABIT_RUN_DIR"
if [ -f "$ERABIT_RUN_DIR/server.pid" ] && kill -0 "$(cat "$ERABIT_RUN_DIR/server.pid")" 2>/dev/null; then
  echo "already running: pid $(cat "$ERABIT_RUN_DIR/server.pid") at $ERABIT_URL (run cleanup.sh to restart)"
  exit 0
fi
if [ -n "$(port_owner "$ERABIT_PORT")" ] || curl -s -o /dev/null --max-time 2 "http://127.0.0.1:${ERABIT_PORT}/"; then
  echo "port $ERABIT_PORT is already served by a process this run did not start; set ERABIT_PORT to a free port" >&2
  exit 1
fi

cd "$REPO"
[ -x node_modules/.bin/vite ] || npm ci --no-audit --no-fund
npm run build > "$ERABIT_RUN_DIR/build.log" 2>&1 || { tail -20 "$ERABIT_RUN_DIR/build.log" >&2; exit 1; }
git rev-parse HEAD > "$ERABIT_RUN_DIR/build.rev"
git status --porcelain -- . ':!.cursor' > "$ERABIT_RUN_DIR/build.dirty"

# setsid detaches the server from this shell, so it outlives the command that launched it.
setsid node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port "$ERABIT_PORT" --strictPort \
  > "$ERABIT_RUN_DIR/server.log" 2>&1 < /dev/null &
echo $! > "$ERABIT_RUN_DIR/server.pid"

for _ in $(seq 1 60); do
  if curl -sf -o "$ERABIT_RUN_DIR/index.html" --max-time 2 "$ERABIT_URL"; then
    bundle="$(grep -o '/Erabit/assets/index-[^"]*\.js' "$ERABIT_RUN_DIR/index.html" | head -1)"
    if [ -n "$bundle" ] && curl -sf -o /dev/null "http://127.0.0.1:${ERABIT_PORT}${bundle}" \
      && ls dist/assets/era-hero-*.png >/dev/null 2>&1; then
      echo "ready $ERABIT_URL (pid $(cat "$ERABIT_RUN_DIR/server.pid"), rev $(cut -c1-7 "$ERABIT_RUN_DIR/build.rev"))"
      exit 0
    fi
  fi
  if ! kill -0 "$(cat "$ERABIT_RUN_DIR/server.pid")" 2>/dev/null; then
    echo "server exited; log:" >&2; cat "$ERABIT_RUN_DIR/server.log" >&2; exit 1
  fi
  sleep 0.5
done
echo "server did not become ready in 30s; log: $ERABIT_RUN_DIR/server.log" >&2
exit 1
