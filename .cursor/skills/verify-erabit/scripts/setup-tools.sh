#!/usr/bin/env bash
# Installs the browser harness outside the repo: playwright-core and Playwright's ffmpeg (for --video) in
# $ERABIT_TOOLS_DIR, plus Chromium only if no Chrome exists.
set -euo pipefail
source "$(dirname "$0")/env.sh"

mkdir -p "$ERABIT_TOOLS_DIR"
cd "$ERABIT_TOOLS_DIR"
[ -f package.json ] || echo '{"private":true}' > package.json
if [ ! -d node_modules/playwright-core ]; then
  npm install --no-audit --no-fund --silent playwright-core@1.64.1
fi

if [ -z "$(find_chrome)" ]; then
  node node_modules/playwright-core/cli.js install chromium
fi
if ! ls -d "$PLAYWRIGHT_BROWSERS_PATH"/ffmpeg-* >/dev/null 2>&1; then
  node node_modules/playwright-core/cli.js install ffmpeg
fi

if [ ! -x "$REPO/node_modules/.bin/tsx" ]; then
  (cd "$REPO" && npm ci --no-audit --no-fund)
fi

echo "tools: $ERABIT_TOOLS_DIR (playwright-core $(node -p "require('$ERABIT_TOOLS_DIR/node_modules/playwright-core/package.json').version"))"
echo "chrome: $(find_chrome)"
