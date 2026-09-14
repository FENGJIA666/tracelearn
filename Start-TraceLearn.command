#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH"
mkdir -p .local
if ! curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NO_CLOUD=1 ollama serve > .local/ollama.log 2>&1 &
fi
[ -d node_modules ] || npm ci
[ -f dist/index.html ] || npm run build
if curl -fsS http://127.0.0.1:4317/api/courses >/dev/null 2>&1; then
  open http://127.0.0.1:4317
  exit 0
fi
npm start > .local/app.log 2>&1 &
TRACELEARN_PID=$!
trap 'kill "$TRACELEARN_PID" 2>/dev/null || true' EXIT INT TERM
for attempt in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:4317/api/courses >/dev/null 2>&1; then
    open http://127.0.0.1:4317
    echo 'TraceLearn is ready. Keep this window open while using it.'
    wait "$TRACELEARN_PID"
    exit 0
  fi
  kill -0 "$TRACELEARN_PID" 2>/dev/null || { cat .local/app.log; exit 1; }
  sleep 1
done
echo 'TraceLearn did not start in time. See .local/app.log.'
exit 1
