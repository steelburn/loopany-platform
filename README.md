# LoopAny

Scheduled **agent loops** for your team. You describe a recurring task; LoopAny runs
it on a schedule via **your own machine's claude-code** (BYOA — bring your own agent)
and surfaces the result on a shared dashboard + Slack. The server never runs an LLM
or executes your code; it only schedules, stores, authenticates, and notifies.

> Carved out of [c0](../c0)'s loop engine. Full design + decision log:
> [`docs/loopany-mvp-design.md`](docs/loopany-mvp-design.md).

## Architecture (one process + a daemon per machine)

```
┌── LoopAny server (TanStack Start · one process · zero code-exec · zero LLM) ──┐
│  dashboard + server fns · Better Auth (GitHub) · in-process Scheduler (croner) │
│  machine routes: /api/machine/poll · /agent-api/loop · /machine/report          │
│  SQLite (Drizzle) on a volume                                                    │
└───────────▲ HTTP short-poll ────────────────────────────────────────────────────┘
            │
┌───────────┴── @crewlet/loopany (your machine · `npx`) ──────────────────────────┐
│  polls for due runs → runs the workflow gate + `claude -p` in a jailed workdir   │
│  reports back via the `loopany` shim (run token)                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

A scheduler tick creates a *pending run*; the bound machine's next poll claims it,
runs claude, and reports the result (which can post to Slack).

## Run it locally

```bash
pnpm install

# 1) the server (UI + scheduler + machine endpoints), one process on :3000
pnpm dev                      # → http://127.0.0.1:3000

# 2) connect a machine (a daemon on the box that should run the loops)
cd packages/daemon && pnpm build
LOOPANY_TOKEN=<device-token> LOOPANY_SERVER_URL=http://127.0.0.1:3000 \
  node dist/cli.js            # foreground; Ctrl-C to stop
```

For the MVP a machine/device token is registered via `POST /api/admin`
(`{action:"register-machine",name,token}`) — see `scripts/demo-cookie-unified.sh`
for the full end-to-end (registers a machine, creates the **Cookie Daily Breakfast Report**
loop, runs it through claude, prints the report).

```bash
bash scripts/demo-cookie-unified.sh   # e2e against the unified dev server
bash scripts/demo-cookie.sh           # e2e against the standalone headless backend
```

## Production (Fly.io)

One always-on machine (the scheduler owns the cron loop — never scale past 1),
SQLite on a volume. See `fly.toml` for the setup commands. Build = nitro
(`.output/server/index.mjs`); `pnpm start` applies migrations then listens.

## Auth & notifications (optional)

- **Auth** is off by default (open). Set `GITHUB_CLIENT_ID/SECRET` +
  `LOOPANY_ALLOWED_LOGINS` to gate the dashboard behind GitHub login.
- **Slack**: set `LOOPANY_SLACK_BOT_TOKEN` + `LOOPANY_SLACK_CHANNEL` to push loop
  results to a channel.

See [`.env.example`](.env.example) for all variables.

## Packages

- `packages/server` (`@loopany/server`) — the product server.
- `packages/daemon` (`@crewlet/loopany`) — the machine-side daemon (one binary,
  two roles: daemon / `loopany` callback).
