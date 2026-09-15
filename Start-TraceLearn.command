#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH"
mkdir -p .local
if ! curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NO_CLOUD=1 ollama serve > .local/ollama.log 2>&1 &
fi
[ -d node_modules ] || npm ci
# Rebuild this copy before comparing identities so changed source cannot launch stale UI assets.
npm run build
TRACELEARN_SELECTION=$(node scripts/identity.mjs select)
read -r TRACELEARN_MODE TRACELEARN_PORT <<< "$TRACELEARN_SELECTION"
TRACELEARN_URL="http://127.0.0.1:$TRACELEARN_PORT"
if [ "$TRACELEARN_MODE" = reuse ]; then
  [ "${TRACELEARN_NO_OPEN:-0}" = 1 ] || open "$TRACELEARN_URL"
  echo "This exact TraceLearn installation is already running at $TRACELEARN_URL."
  exit 0
fi
if [ "$TRACELEARN_PORT" != 4317 ]; then
  echo "Another local installation or application uses the default port. Starting this copy at $TRACELEARN_URL."
fi
# Track the actual app process so closing this launcher stops its own server, not only an npm wrapper.
PORT="$TRACELEARN_PORT" node --import tsx server/index.ts > .local/app.log 2>&1 &
TRACELEARN_PID=$!
trap 'kill "$TRACELEARN_PID" 2>/dev/null || true' EXIT INT TERM
for attempt in $(seq 1 60); do
  if node scripts/identity.mjs check "$TRACELEARN_PORT"; then
    [ "${TRACELEARN_NO_OPEN:-0}" = 1 ] || open "$TRACELEARN_URL"
    echo 'TraceLearn is ready. Keep this window open while using it.'
    wait "$TRACELEARN_PID"
    exit 0
  fi
  kill -0 "$TRACELEARN_PID" 2>/dev/null || { cat .local/app.log; exit 1; }
  sleep 1
done
echo 'TraceLearn did not start in time. See .local/app.log.'
exit 1
