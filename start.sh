#!/usr/bin/env bash
set -euo pipefail

PORT=3001
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

kill_port() {
  local pids
  pids=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "Stopping process(es) on port $PORT: $pids"
    echo "$pids" | xargs kill -TERM 2>/dev/null || true
    sleep 1
    # Force kill if still running
    pids=$(lsof -ti :"$PORT" 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
      echo "Force killing remaining process(es): $pids"
      echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
    echo "Port $PORT cleared."
  fi
}

run_dev() {
  echo "Starting dev server on port $PORT..."
  cd "$PROJECT_DIR"
  exec npm run dev
}

run_prod() {
  echo "Building for production..."
  cd "$PROJECT_DIR"
  npm run build
  echo "Starting production server on port $PORT..."
  exec npm run start
}

# If argument passed directly, use it
choice="${1:-}"

if [[ -z "$choice" ]]; then
  echo "Personal Homepage"
  echo "================="
  echo "1) Dev server"
  echo "2) Production server"
  echo ""
  read -rp "Select [1/2]: " choice
fi

case "$choice" in
  1|dev)
    kill_port
    run_dev
    ;;
  2|prod)
    kill_port
    run_prod
    ;;
  *)
    echo "Invalid selection: $choice"
    exit 1
    ;;
esac
