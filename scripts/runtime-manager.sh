#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
mkdir -p "$RUNTIME_DIR"

WEB_LOG="$RUNTIME_DIR/web.log"
WEB_PID="$RUNTIME_DIR/web.pid"
WEB_WATCHDOG_PID="$RUNTIME_DIR/web.watchdog.pid"

EXPO_LOG="$RUNTIME_DIR/expo.log"
EXPO_PID="$RUNTIME_DIR/expo.pid"
EXPO_WATCHDOG_PID="$RUNTIME_DIR/expo.watchdog.pid"

WEB_CMD='cd "$ROOT_DIR" && pnpm --filter web dev -- --host 0.0.0.0 --port 3000'
EXPO_CMD='cd "$ROOT_DIR" && CI=1 pnpm --filter mobile exec expo start --tunnel --port 8081'

is_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

read_pid() {
  local file="$1"
  [[ -f "$file" ]] && cat "$file" || true
}

start_watchdog() {
  local name="$1"
  local cmd="$2"
  local log_file="$3"
  local child_pid_file="$4"
  local watchdog_pid_file="$5"

  local existing_watchdog
  existing_watchdog="$(read_pid "$watchdog_pid_file")"
  if is_running "$existing_watchdog"; then
    echo "[$name] watchdog already running (pid: $existing_watchdog)"
    return 0
  fi

  nohup env \
    WD_NAME="$name" \
    WD_CMD="$cmd" \
    WD_LOG_FILE="$log_file" \
    WD_CHILD_PID_FILE="$child_pid_file" \
    "$ROOT_DIR/scripts/watchdog-worker.sh" \
    >/dev/null 2>&1 &

  echo "$!" > "$watchdog_pid_file"
  echo "[$name] watchdog started (pid: $(cat "$watchdog_pid_file"))"
}

stop_watchdog() {
  local name="$1"
  local child_pid_file="$2"
  local watchdog_pid_file="$3"

  local watchdog_pid
  watchdog_pid="$(read_pid "$watchdog_pid_file")"
  if is_running "$watchdog_pid"; then
    kill "$watchdog_pid" 2>/dev/null || true
    sleep 1
    is_running "$watchdog_pid" && kill -9 "$watchdog_pid" 2>/dev/null || true
    echo "[$name] watchdog stopped"
  else
    echo "[$name] watchdog not running"
  fi
  rm -f "$watchdog_pid_file"

  local child_pid
  child_pid="$(read_pid "$child_pid_file")"
  if is_running "$child_pid"; then
    kill "$child_pid" 2>/dev/null || true
    sleep 1
    is_running "$child_pid" && kill -9 "$child_pid" 2>/dev/null || true
    echo "[$name] process stopped"
  fi
  rm -f "$child_pid_file"
}

status_one() {
  local name="$1"
  local child_pid_file="$2"
  local watchdog_pid_file="$3"
  local port="$4"

  local watchdog_pid child_pid
  watchdog_pid="$(read_pid "$watchdog_pid_file")"
  child_pid="$(read_pid "$child_pid_file")"

  if is_running "$watchdog_pid"; then echo "[$name] watchdog: running (pid $watchdog_pid)"; else echo "[$name] watchdog: stopped"; fi
  if is_running "$child_pid"; then echo "[$name] process: running (pid $child_pid)"; else echo "[$name] process: stopped"; fi
  if ss -ltn "sport = :$port" | grep -q LISTEN; then echo "[$name] port $port: listening"; else echo "[$name] port $port: not listening"; fi
}

case "${1:-}" in
  start)
    start_watchdog "web" "$WEB_CMD" "$WEB_LOG" "$WEB_PID" "$WEB_WATCHDOG_PID"
    start_watchdog "expo" "$EXPO_CMD" "$EXPO_LOG" "$EXPO_PID" "$EXPO_WATCHDOG_PID"
    ;;
  stop)
    stop_watchdog "web" "$WEB_PID" "$WEB_WATCHDOG_PID"
    stop_watchdog "expo" "$EXPO_PID" "$EXPO_WATCHDOG_PID"
    ;;
  restart)
    "$0" stop
    "$0" start
    ;;
  status)
    status_one "web" "$WEB_PID" "$WEB_WATCHDOG_PID" "3000"
    status_one "expo" "$EXPO_PID" "$EXPO_WATCHDOG_PID" "8081"
    ;;
  logs)
    case "${2:-all}" in
      web) tail -n 100 -f "$WEB_LOG" ;;
      expo) tail -n 100 -f "$EXPO_LOG" ;;
      all) tail -n 100 -f "$WEB_LOG" "$EXPO_LOG" ;;
      *) echo "Usage: $0 logs [web|expo|all]"; exit 1 ;;
    esac
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs [web|expo|all]}"
    exit 1
    ;;
esac
