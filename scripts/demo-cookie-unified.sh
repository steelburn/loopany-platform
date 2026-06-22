#!/usr/bin/env bash
# Cookie loop e2e against the UNIFIED TanStack server (pnpm dev) — the real
# product server: UI + server fns + machine routes + in-process scheduler, ONE
# process. Seeds via /api/admin; the daemon polls the TanStack machine routes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$ROOT/packages/server"
DAEMON_CLI="$ROOT/packages/daemon/dist/cli.js"

TMP="$(mktemp -d -t loopany-cookieU)"
PORT="${LOOPANY_PORT:-3877}"
BASE="http://127.0.0.1:$PORT"
TOKEN="dk_demo_cookie_unified"

server_pid=""; daemon_pid=""
cleanup() {
  [ -n "$daemon_pid" ] && kill "$daemon_pid" 2>/dev/null || true
  [ -n "$server_pid" ] && { kill "$server_pid" 2>/dev/null; pkill -P "$server_pid" 2>/dev/null; } || true
  rm -rf "$TMP"
}
trap cleanup EXIT

admin() { curl -fsS -X POST "$BASE/api/admin" -H 'Content-Type: application/json' -d "$1"; }

echo "▶ temp data dir: $TMP"
echo "▶ starting unified server (pnpm dev) on $BASE ..."
( cd "$SERVER_DIR" && LOOPANY_PORT="$PORT" LOOPANY_DATA_DIR="$TMP" LOOPANY_DB_PATH="$TMP/loopany.db" LOOPANY_LOG_LEVEL=info \
    pnpm dev ) >"$TMP/server.log" 2>&1 &
server_pid=$!

echo "▶ waiting for the /api/admin server route ..."
ready=""
for i in $(seq 1 80); do
  if admin '{"action":"list-jobs"}' >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
  if ! kill -0 "$server_pid" 2>/dev/null; then echo "server died:"; tail -30 "$TMP/server.log"; exit 1; fi
done
[ -n "$ready" ] || { echo "server route not responding:"; tail -30 "$TMP/server.log"; exit 1; }

echo "▶ registering machine"
MACHINE_ID="$(admin "{\"action\":\"register-machine\",\"name\":\"Demo Mac\",\"token\":\"$TOKEN\"}" | node -e 'console.log(JSON.parse(require("fs").readFileSync(0)).machine.id)')"
echo "  machine: $MACHINE_ID"

echo "▶ creating loop 'Cookie每日早餐报告' (due now)"
read -r -d '' TASK <<'EOF' || true
你是 Cookie，一只热爱美食、贴心的小助手。每天早上为主人生成一份「今日早餐报告」：
结合当前季节与营养均衡，推荐一份具体的中式早餐搭配（主食 + 蛋白 + 果蔬 + 一杯饮品），
并在结尾附一句温暖的早安寄语。整体控制在 5 行以内，用中文，语气轻松温暖。
EOF
LOOP_ID="$(node -e '
  process.stdout.write(JSON.stringify({action:"create-loop",name:"Cookie每日早餐报告",machineId:process.argv[2],cron:"0 8 * * *",task:process.argv[1],notify:"always",nextRunAt:new Date().toISOString()}));
' "$TASK" "$MACHINE_ID" | { read -r payload; admin "$payload"; } | node -e 'console.log(JSON.parse(require("fs").readFileSync(0)).loop.id)')"
echo "  loop: $LOOP_ID"

echo "▶ starting daemon → $BASE"
LOOPANY_TOKEN="$TOKEN" LOOPANY_SERVER_URL="$BASE" LOOPANY_POLL_MS=2000 \
  node "$DAEMON_CLI" >"$TMP/daemon.log" 2>&1 &
daemon_pid=$!

echo "▶ waiting for the run to complete ..."
PHASE=""
for i in $(seq 1 90); do
  PHASE="$(admin "{\"action\":\"list-runs\",\"id\":\"$LOOP_ID\"}" | node -e 'const r=JSON.parse(require("fs").readFileSync(0));const last=r[r.length-1]||r[0];console.log(last?.phase ?? "")')"
  [ "$PHASE" = "done" ] || [ "$PHASE" = "error" ] && break
  sleep 2
done

echo; echo "════════════ RESULT (unified TanStack server) ════════════"
admin "{\"action\":\"list-runs\",\"id\":\"$LOOP_ID\"}" | node -e '
  const runs = JSON.parse(require("fs").readFileSync(0,"utf8"));
  const r = runs[runs.length-1] || runs[0];
  if (!r) { console.log("(no run)"); process.exit(0); }
  for (const k of ["phase","outcome","status","durationMs","error","sessionId"]) console.log(k.padEnd(9),":",r[k] ?? "—");
  console.log("──────── message ────────"); console.log(r.message ?? "(none)");
'
echo "══════════════════════════════════════════════════════════"
echo; echo "(daemon log tail:)"; tail -6 "$TMP/daemon.log" || true
[ "$PHASE" = "done" ] || { echo "❌ phase=$PHASE"; echo "(server log tail:)"; tail -20 "$TMP/server.log"; exit 1; }
echo "✅ Cookie每日早餐报告 ran end-to-end through the unified product server."
