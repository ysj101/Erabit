#!/usr/bin/env bash
# Stops only the server this run launched and deletes its scratch dir. Evidence is never deleted.
set -uo pipefail
source "$(dirname "$0")/env.sh"

pidfile="$ERABIT_RUN_DIR/server.pid"
if [ -f "$pidfile" ]; then
  pid="$(cat "$pidfile")"
  if kill -0 "$pid" 2>/dev/null; then
    kill -TERM "$pid" 2>/dev/null
    for _ in $(seq 1 20); do kill -0 "$pid" 2>/dev/null || break; sleep 0.25; done
    kill -0 "$pid" 2>/dev/null && kill -KILL "$pid" 2>/dev/null
    echo "stopped server pid $pid"
  else
    echo "server pid $pid already gone"
  fi
else
  echo "no server launched from $ERABIT_RUN_DIR"
fi

case "$ERABIT_RUN_DIR" in
  "$ERABIT_EVIDENCE_DIR"|"$ERABIT_EVIDENCE_DIR"/*) echo "refusing to delete run dir inside evidence dir" >&2 ;;
  *) rm -rf "$ERABIT_RUN_DIR" && echo "removed scratch $ERABIT_RUN_DIR" ;;
esac

if [ -d "$ERABIT_EVIDENCE_DIR" ]; then
  echo "evidence kept: $ERABIT_EVIDENCE_DIR ($(find "$ERABIT_EVIDENCE_DIR" -type f | wc -l) files)"
fi
