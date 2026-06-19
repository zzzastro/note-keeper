#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"

[ -f "$DIR/.env" ] && set -a && source "$DIR/.env" && set +a

cleanup() {
  echo "Stopping..."
  kill $API_PID $UI_PID 2>/dev/null
  wait $API_PID $UI_PID 2>/dev/null
  echo "Done"
}
trap cleanup EXIT INT TERM

echo "Starting API..."
cd "$DIR/note-keeper-api"
uv run uvicorn main:app --host 0.0.0.0 --port 8004 &
API_PID=$!

echo "Starting UI..."
cd "$DIR/note-keeper-ui"
bun run dev &
UI_PID=$!

echo "API: http://localhost:8004"
echo "UI:  http://localhost:5173"
echo "Press Ctrl+C to stop both"

wait
