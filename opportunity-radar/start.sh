#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -x .venv/bin/python ]]; then
  printf '%s\n' 'First run the README setup commands to create .venv and install the Python packages.'
  exit 1
fi
if [[ ! -d frontend/node_modules ]]; then
  printf '%s\n' 'First run: cd frontend && npm ci'
  exit 1
fi
cleanup() { kill "$api_pid" "$front_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 &
api_pid=$!
(cd frontend && exec node node_modules/vite/bin/vite.js --host 127.0.0.1) &
front_pid=$!
printf '\n%s\n' 'Open http://127.0.0.1:5173/opportunity-radar/' 'Jobs refresh in the background at startup and every four hours. Ctrl+C stops both servers.'
wait "$api_pid" "$front_pid"
