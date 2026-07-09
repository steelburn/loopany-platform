<div align="center">

<img alt="Loopany" src="docs/assets/logo.svg" width="50">

# Loopany

**Scheduled agent loops. Keep the system under control.**

Describe a recurring task once. Loopany runs it on a schedule with **your own
machine's coding agent**, and surfaces every result on a shared dashboard and
your team's notification channel.

[![npm](https://img.shields.io/npm/v/@crewlet/loopany)](https://www.npmjs.com/package/@crewlet/loopany)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/superdesigndev/loopany-platform?style=flat)](https://github.com/superdesigndev/loopany-platform/stargazers)
[![Deploy](https://img.shields.io/github/actions/workflow/status/superdesigndev/loopany-platform/deploy.yml?label=deploy)](https://github.com/superdesigndev/loopany-platform/actions/workflows/deploy.yml)

[Website](https://loopany.ai) · [npm](https://www.npmjs.com/package/@crewlet/loopany) · [Contributing](CONTRIBUTING.md) · [Architecture](AGENTS.md)

</div>

## What is Loopany?

Loopany is infrastructure for **recurring agent work**. You describe a loop -
a daily health check, a weekly research digest, a closed goal like "follow up
until the release is quiet" - and a small daemon on a machine you control runs
it on schedule using your local coding agent.

The server (TanStack Start) schedules, stores, authenticates, and notifies.
**It never runs an LLM and never executes your code.** Execution is BYOA:
[`@crewlet/loopany`](https://www.npmjs.com/package/@crewlet/loopany) on *your*
machine, with *your* credentials, files, and tools. Artifacts you choose to
sync come back as a durable content home; the rest never leaves the box.

A loop can stay **open** (a monitor or digest that runs indefinitely) or
**closed** (a finish line: the loop completes itself when the goal is met).
Loops also improve themselves - periodically reviewing their own history to
sharpen the brief, distill working memory, fold mechanical work into a cheap
deterministic pre-stage, and refine the dashboard.

## Why "Loopany"?

**Loop** + the soft cadence of *any* - loop anything, keep looping.

The deeper root is older. *Cybernetics* comes from Greek *kybernetes*:
**steersman, helmsman** - the one who keeps a vessel on course by reading
feedback and adjusting the helm. Most systems you care about (a codebase, a
product, a team, your metrics) stay healthy the same way: small recurring
loops. Check what changed, triage what's new, summarize, nudge whatever
drifted. Each loop is trivial alone; together they are how a complex system
stays under control. And they all compete for your attention - the moment you
stop turning the crank, the system goes quiet.

Loopany is the steersman for those chores. Describe the loop once; an agent on
your own machine turns the crank on schedule - watching, digesting, acting,
and reporting every run - so your attention stays on the judgment calls, not
the cranking.

## Features

- **Scheduled agent loops** - cron or one-shot; open monitors or closed goals
  that finish themselves when met.
- **BYOA execution** - runs on your machine via `@crewlet/loopany`; the server
  is zero-LLM and zero code-exec. Credentials and tools stay local.
- **Self-improving loops** - evolve passes review run history, sharpen the
  brief, distill state, and refine the generative dashboard.
- **Deterministic pre-stage** - optional workflow body for cheap mechanical
  work before the agent; failures fall back to the agent with context.
- **Teams + notifications** - multi-user dashboard, per-team push channels
  (Telegram, Feishu; Slack transport supported), failure alerts with anti-spam.
- **Synced artifact home** - loop folder in, dashboard out; front-matter
  products (reports, kanban cards, calendars) render as generative UI.
- **Templates** - React Doctor, Market Research, Follow-up Tracker, Docs Sweep,
  Housekeeper, Dependency Triage, Error Sweep - intent seeds, not rigid flows.
- **Self-hostable** - one process, embedded pglite by default for local, Postgres
  + object store for production; Docker image included.

## Anatomy of good loops

Describing the task is the easy 5%. The real work is the structure that lets
you walk away while it runs. Every good loop we have seen follows the same
playbook.

### Four parts of a good loop

| Part | What it is |
| --- | --- |
| **Contract** | One file the agent re-reads every run: the goal, the boundary fence, the steps. The fence decides whether you can walk away. |
| **State + logs** | Durable memory across runs, so it never re-does work and every lesson sticks. Month three is smarter than week one. |
| **Verifier** | Work loops with verify until there is evidence a human can glance at. No proof, not done. |
| **Trigger** | The cheapest trigger that fits: continuous push toward a goal, a cron schedule, or a gated event so empty runs cost nothing. |

### Three roles serious loops split into

Simple loops are one agent doing the whole job. Once a loop ships real work to
real people, it splits:

1. **Orchestrator** - finds the work (reads what changed, picks the single most
   worthwhile thing this run). It never does the work itself.
2. **Executor** - does the work in an isolated lane (a fresh worktree per task)
   so lanes never touch your checkout or each other.
3. **Verifier** - independently proves each result and attaches the evidence.
   That proof is what you review.

You approve evidence, not diffs.

### Evolve, or the loop stays as dumb as day one

Fragile systems break on a bad run. Robust ones survive it. An **antifragile**
loop gets stronger from it: a periodic evolve pass reads the last dozen runs
and asks where money was wasted, which boundary is too loose, which mistake
keeps repeating.

Its output is not product work. It is changes to the loop itself - a tighter
contract, a cheaper trigger, mechanical steps folded into scripts and skills.
A loop that improves the loop, so it gets sharper and cheaper the longer it
runs.

Loopany ships the guardrails by default: contract, state, and logs born with
every loop; boundaries re-read at the top of every run; time, event, and gated
triggers; an evolve pass that reviews its own history; a purpose-built
dashboard per loop, not a log to scroll.

---

## Quickstart (connect to a server)

You need an account on a Loopany server (the web app) and a machine you control
to run the loops on.

1. **Sign in** to the Loopany web app ([loopany.ai](https://loopany.ai) or your
   self-hosted instance).
2. **Create a loop.** The *New loop* dialog hands you a short **connect
   snippet** with a server URL and a one-time connect-key. Or start from a
   **template** - the cards beside *New loop* (like *React Doctor*) hand you
   the same snippet with the loop's task description filled in.
3. **Connect your machine.** Paste the whole snippet into your local coding
   agent - it connects the machine and builds the loop with you. Or start the
   daemon directly:

   ```bash
   npx @crewlet/loopany up --server-url <server-url> --connect-key <connect-key>
   ```

### Daemon cheatsheet

`npx @crewlet/loopany --help` for everything:

| Command | What it does |
| --- | --- |
| `up` / `up --foreground` | connect & start the poll loop (detached / foreground) |
| `status` / `down` | is the daemon running + connection state / stop it |
| `log` | survey a loop's recent runs (`--transcript` for full text) |
| `new` / `edit` | create or patch a loop (JSON config) |
| `@latest update` | upgrade the daemon in place (the dashboard flags outdated ones) |

---

## How it works

Loopany is one server process plus one daemon per machine. The server never
runs an LLM and never executes your code - it only schedules, stores artifacts,
authenticates, and notifies. Execution happens on **your** machine via the
[`@crewlet/loopany`](https://www.npmjs.com/package/@crewlet/loopany) daemon,
talking to your local coding agent.

```
┌── Loopany server (TanStack Start · one process · zero code-exec · zero LLM) ──┐
│  dashboard + server fns · Better Auth · in-process Scheduler (croner)          │
│  machine routes: /api/machine/cli (unified CLI dispatch) · /api/machine/poll     │
│                  /machine/report · /api/machine/sync · /api/machine/blob/:hash    │
│                  /agent-api/loop · /api/machine/loop|log (legacy CLI aliases)     │
│  Postgres (Drizzle; embedded pglite by default) · artifact bytes in object store │
└───────────▲ HTTP poll (idle long-poll) ────────────────────────────────────────┘
            │
┌───────────┴── @crewlet/loopany (your machine · `npx`) ──────────────────────────┐
│  polls for due runs → runs the task with your local coding agent                 │
│  syncs artifacts + reports the result back via the `loopany` callback            │
└──────────────────────────────────────────────────────────────────────────────────┘
```

A scheduler tick creates a *pending run*; your bound machine's next poll claims
it, runs the agent, and reports the result (which can post to the loop's push
channel). Because the agent runs on your machine, your credentials, files, and
tools never leave it - the server only stores the bytes your loop chooses to
sync back.

---

## Run your own server

### Prerequisites

- Node.js >= 22
- pnpm 8.15 (pinned via the root `packageManager` field; `corepack enable`
  picks it up automatically)

### Local development

```bash
git clone https://github.com/superdesigndev/loopany-platform
cd loopany-platform
pnpm install
pnpm dev            # http://127.0.0.1:3000
```

That is a fully working server out of the box: auth is off (the app runs open),
the database is an embedded, file-backed **pglite** Postgres at `~/.loopany/pgdata`
(zero external DB - it migrates itself at boot), and artifact bytes are held in
memory. Use the Quickstart above against `http://127.0.0.1:3000` to connect a
machine.

All configuration is env-based. For **local development only**, copy
[`.env.example`](.env.example) to `packages/server/.env` and uncomment what you
need - vite loads that file for `pnpm dev`. **`pnpm start` and Docker do NOT
read `.env`**: in production pass real environment variables instead (Fly
secrets, `docker -e` / `--env-file`, or a systemd `Environment=`), never a
committed `.env`.

### Production (any Node host)

```bash
pnpm install
pnpm build          # nitro build → packages/server/.output
pnpm start          # applies pending DB migrations, then serves on $PORT
```

For a real deployment, set at minimum:

- **Database** - either point `DATABASE_URL` at a Postgres (e.g. Supabase; set
  it to the transaction pooler `:6543`, plus `DIRECT_DATABASE_URL` at the direct
  `:5432` URL for migrations), or leave both unset and set **`LOOPANY_DB=pglite`**
  plus a persistent `LOOPANY_DATA_DIR` - the embedded pglite database lives at
  `<dir>/pgdata`. The built server treats a missing `DATABASE_URL` as a config
  error unless `LOOPANY_DB=pglite` explicitly opts into the embedded tier (so a
  lost database secret fails the deploy loudly instead of silently booting an
  empty ephemeral DB); only `pnpm dev` runs pglite without the opt-in.
  `pnpm start` applies pending migrations before serving (over the direct URL
  for the hosted tier; in-process for the pglite tier).
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` + `LOOPANY_AUTH_SECRET` (a long
  random value) + `LOOPANY_BASE_URL` + `LOOPANY_ALLOWED_LOGINS` - gate sign-in
  behind GitHub. Leaving these unset runs the app **open, with no auth** -
  fine locally, not on the public internet.
- `LOOPANY_R2_*` - an S3-compatible object store (e.g. Cloudflare R2) for
  artifact bytes. Unset, artifacts are stored in memory and lost on restart.

> **Exposing a server publicly? Set the auth vars.** With `GITHUB_CLIENT_ID` /
> `GITHUB_CLIENT_SECRET` / `LOOPANY_AUTH_SECRET` / `LOOPANY_BASE_URL` /
> `LOOPANY_ALLOWED_LOGINS` unset the app runs **open, with no sign-in** -
> anyone who can reach it is in. This applies equally to a bare Node host and
> the Docker image below.

> **Run exactly one server process.** The in-process scheduler owns the cron
> loop; two processes against the same DB would double-fire every run.

> **Backing up the embedded pglite tier.** `<LOOPANY_DATA_DIR>/pgdata` is a LIVE
> Postgres data directory. Stop the server before copying it - a hot copy of a
> running data dir is not crash-consistent. If you need real, online backups,
> run the hosted tier instead (`DATABASE_URL`/Supabase gives you point-in-time
> backups).

### Docker

The included [`Dockerfile`](Dockerfile) builds the server. For the embedded
pglite database, opt in with `LOOPANY_DB=pglite` and persist `/data` on a
volume; with a `DATABASE_URL` (Supabase/any Postgres) the container is
stateless and needs no volume. (The opt-in is deliberate: without it a
container that LOST its `DATABASE_URL` would silently boot an empty ephemeral
database - instead it refuses to start.)

```bash
docker build -t loopany .
# Embedded pglite (opt in + persist the DB on a volume):
docker run -p 3000:3000 -e LOOPANY_DB=pglite -v loopany-data:/data loopany
# Or against Postgres (stateless):
docker run -p 3000:3000 -e DATABASE_URL=... -e DIRECT_DATABASE_URL=... loopany
```

Pass configuration with `-e KEY=value` or `--env-file` (same variables as
[`.env.example`](.env.example)).

### Teams

With sign-in on, the dashboard's *Teams* button manages membership: create,
rename, or delete a team (delete is blocked while it still owns loops), set
each member's role (owner or member), and add teammates by email or via a
single-use, 7-day invite link (`/invite/<token>`). Team management is
owner-only; any member can still create loops. Invites never widen who can
sign in - the redeemer must already have made it through
`LOOPANY_ALLOWED_LOGINS`. Everyone gets a personal team that can't be deleted
or left, only renamed. Open mode (no sign-in) hides this entirely.

### Notifications

Push channels are configured per team in the dashboard (the *Notifications*
modal) - Telegram and Feishu have add-forms today; Slack is a supported
delivery transport. Channel secrets are stored server-side per team, never in
env vars. Failure alerts ride the same channel: a failed run or a machine that
goes offline pushes an alert (anti-spammed: first failure, then every 5th).

---

## Development

```bash
pnpm dev            # server on http://127.0.0.1:3000
pnpm -r test        # all tests
pnpm -r typecheck   # both packages
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the contributor guide (migrations,
releases, PR flow) and [`AGENTS.md`](AGENTS.md) for architecture notes.

## License

[MIT](LICENSE) - every package is MIT:

- The machine-side daemon [`@crewlet/loopany`](packages/daemon) is
  [MIT](packages/daemon/LICENSE).
- The platform server [`@loopany/server`](packages/server) is
  [MIT](packages/server/LICENSE).

© 2026 Superdesign. Contributions are accepted under the MIT license
(inbound=outbound) - no CLA, no sign-off required.
