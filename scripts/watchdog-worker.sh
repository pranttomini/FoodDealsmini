#!/usr/bin/env bash
set -euo pipefail

: "${WD_NAME:?missing WD_NAME}"
: "${WD_CMD:?missing WD_CMD}"
: "${WD_LOG_FILE:?missing WD_LOG_FILE}"
: "${WD_CHILD_PID_FILE:?missing WD_CHILD_PID_FILE}"

child_pid=""

cleanup() {
  if [[ -n "$child_pid" ]] && kill -0 "$child_pid" 2>/dev/null; then
    kill "$child_pid" 2>/dev/null || true
    wait "$child_pid" 2>/dev/null || true
  fi
  rm -f "$WD_CHILD_PID_FILE"
  exit 0
}

trap cleanup TERM INT

while true; do
  if [[ -z "$child_pid" ]] || ! kill -0 "$child_pid" 2>/dev/null; then
    echo "[$(date '+%F %T')] starting $WD_NAME" >> "$WD_LOG_FILE"
    bash -lc "$WD_CMD" >> "$WD_LOG_FILE" 2>&1 &
    child_pid="$!"
    echo "$child_pid" > "$WD_CHILD_PID_FILE"
  fi

  wait "$child_pid" 2>/dev/null || true
  echo "[$(date '+%F %T')] $WD_NAME exited, restarting in 2s" >> "$WD_LOG_FILE"
  sleep 2
  child_pid=""
  rm -f "$WD_CHILD_PID_FILE"
done
