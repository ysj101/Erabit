# Shared settings for the verify-erabit helpers. Sourced, not executed.
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(git -C "$SKILL_DIR" rev-parse --show-toplevel)"
ERABIT_PORT="${ERABIT_PORT:-4173}"
ERABIT_URL="http://127.0.0.1:${ERABIT_PORT}/Erabit/"
# Scratch state for one launched instance (pid, logs). Cleanup deletes this.
ERABIT_RUN_DIR="${ERABIT_RUN_DIR:-/tmp/verify-erabit/run-${ERABIT_PORT}}"
# Proof artifacts. Cleanup never touches this.
ERABIT_EVIDENCE_DIR="${ERABIT_EVIDENCE_DIR:-/tmp/verify-erabit/evidence}"
# playwright-core lives outside the repo so the app gains no dependency.
ERABIT_TOOLS_DIR="${ERABIT_TOOLS_DIR:-$HOME/.cache/verify-erabit-tools}"
# Playwright's own downloads (its ffmpeg for --video, Chromium when no Chrome exists).
PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$ERABIT_TOOLS_DIR/browsers}"
export ERABIT_PORT ERABIT_URL ERABIT_RUN_DIR ERABIT_EVIDENCE_DIR ERABIT_TOOLS_DIR PLAYWRIGHT_BROWSERS_PATH

port_owner() {
  if command -v lsof >/dev/null 2>&1; then lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -1; return; fi
  if command -v ss >/dev/null 2>&1; then ss -ltnpH "sport = :$1" | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2; return; fi
  local hex inode fd
  hex="$(printf '%04X' "$1")"
  inode="$(awk -v p=":$hex" '$2 ~ p"$" && $4 == "0A" { print $10; exit }' /proc/net/tcp /proc/net/tcp6 2>/dev/null)"
  [ -n "$inode" ] || return 0
  for fd in /proc/[0-9]*/fd/*; do
    if [ "$(readlink "$fd" 2>/dev/null)" = "socket:[$inode]" ]; then echo "$fd" | cut -d/ -f3; return; fi
  done
}

find_chrome() {
  if [ -n "${CHROME:-}" ] && [ -x "$CHROME" ]; then echo "$CHROME"; return; fi
  for c in google-chrome-stable google-chrome chromium chromium-browser; do
    if command -v "$c" >/dev/null 2>&1; then command -v "$c"; return; fi
  done
  ls -d "$PLAYWRIGHT_BROWSERS_PATH"/chromium-*/chrome-linux*/chrome 2>/dev/null | head -1
}
