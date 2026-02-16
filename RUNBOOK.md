# RUNBOOK – FoodDealsmini Runtime (VPS)

`pm2` is not installed on this VPS, so runtime is managed with a persistent watchdog script pair.

## Managed services
- **Web (Vite):** port `3000`
- **Expo dev tunnel/metro:** port `8081`

## Commands
From repo root (`/root/.openclaw/workspace/FoodDealsmini`):

```bash
./scripts/runtime-manager.sh start
./scripts/runtime-manager.sh stop
./scripts/runtime-manager.sh restart
./scripts/runtime-manager.sh status
./scripts/runtime-manager.sh logs web
./scripts/runtime-manager.sh logs expo
./scripts/runtime-manager.sh logs all
```

## What it does
- Starts one watchdog per service (`scripts/watchdog-worker.sh`)
- Restarts each service automatically if it exits/crashes
- Stores runtime files under `.runtime/`:
  - `web.watchdog.pid`, `web.pid`, `web.log`
  - `expo.watchdog.pid`, `expo.pid`, `expo.log`

## Verification URLs
- Web local: `http://127.0.0.1:3000`
- Web public: `http://v45207.1blu.de:3000`
- Expo/metro local: `http://127.0.0.1:8081`
- Expo/metro public: `http://v45207.1blu.de:8081`

## Quick health checks
```bash
./scripts/runtime-manager.sh status
ss -ltn '( sport = :3000 or sport = :8081 )'
```
