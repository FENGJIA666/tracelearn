#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo 'Install Node.js 22.13+ from https://nodejs.org first.'; exit 1; }
command -v ollama >/dev/null || { echo 'Install Ollama from https://ollama.com/download first, then run this script again.'; exit 1; }
mkdir -p .local
if ! curl -fsS http://127.0.0.1:11434/api/tags >/dev/null; then
  OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NO_CLOUD=1 ollama serve > .local/ollama.log 2>&1 &
  for attempt in $(seq 1 30); do
    curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1 && break
    sleep 1
  done
fi
node scripts/check-ollama-version.mjs
ollama pull qwen3.5:9b
ollama pull qwen3-embedding:0.6b
npm ci
npm run build
node scripts/model-manifest.mjs
echo 'Ready. Run npm start and open http://127.0.0.1:4317.'
