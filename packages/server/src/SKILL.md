---
name: loopany-build-loop
description: Turn a task you just completed in this Claude Code session into a scheduled LoopAny loop — write its task file, register this machine, and create the loop via the API.
---

# LoopAny — build a loop from what we just did

You just helped the user accomplish a task they want to run **automatically on a
schedule**. Turn it into a LoopAny *loop*. The user's LoopAny web tab is open and
waiting for the loop to appear — so just do the steps below end to end; don't ask
follow-up questions.

The user pasted these values along with this link — use them verbatim:

- **server-url** — the LoopAny server base URL (e.g. `http://localhost:3000`)
- **connect-key** — a one-time token (starts with `dk_`). It both authorizes a NEW
  machine and tags the loop back to the web dialog (its `claim`).
- **daemon-cmd** *(optional)* — the command to start the daemon. If absent, use
  `npx @crewlet/loopany@latest`.

## 1 · Make sure a daemon is running for THIS machine

This machine keeps a stable identity in `~/.loopany/device-token`. Decide the
device token to use:

```bash
if [ -s ~/.loopany/device-token ]; then
  DEVICE_TOKEN="$(cat ~/.loopany/device-token)"      # already connected before → reuse this machine
else
  DEVICE_TOKEN="<connect-key>"                        # first time → adopt the connect-key as this machine
fi                                                    # (the daemon persists it to ~/.loopany/device-token on start)
```

Then check whether its daemon is already live — **don't start a second one**:

```bash
curl -s "<server-url>/api/machine/status" -H "Authorization: Bearer $DEVICE_TOKEN"
# -> {"online": true|false, ...}
```

If `online` is **true**, skip to step 2. Otherwise start it **detached** so it
survives this Claude Code session (it long-polls forever; a plain `&` dies with the
session):

```bash
mkdir -p ~/.loopany
nohup <daemon-cmd> --server-url <server-url> --api-key "$DEVICE_TOKEN" > ~/.loopany/daemon.log 2>&1 &
```

Re-check `/api/machine/status` every couple of seconds until `online` is true
before continuing (the daemon self-registers the machine on its first poll).

## 2 · Write the task file

Every loop is anchored by a **task file**: a markdown doc kept in the project that
is the loop's durable brief and running memory. Each scheduled run reads it for
context and appends what it did, so the loop stays coherent over time.

Create it at `<project>/loopany/<slug>.md` (make the folder if needed), filled in
from what we ACTUALLY just did — real URLs, paths, commands, thresholds:

```markdown
# <Loop name>

## Goal
What this loop checks or does, and why.

## How it runs
The concrete steps / commands / endpoints / files involved — the real ones from
this session.

## Notify
When to message the user vs. stay silent.

## Log
<!-- one dated entry per run, appended below by the loop -->
```

Keep the absolute path to this file — it goes in the config as `taskFile`.

## 3 · Author the loop config

A loop fires on a cron schedule. Each run is **either**:

- **workflow** *(preferred — zero-LLM, cheap)*: a JS **function body** run in Node
  with global `fetch` and a `prev` cursor (the last run's returned `state`).
  Contract: `return { message?: string, state?: any }`. `message` is sent to the
  user verbatim (no LLM). `state` is persisted and handed back as `prev` next run
  (use it to diff / avoid repeating). To escalate to the coding agent instead,
  call `agent(message?, data?)`. Prefer this whenever the task is deterministic
  (hit an API, read a value, compute a digest).
- **task** *(the coding agent / claude)*: a natural-language instruction for runs
  that need reasoning, code, or file work. It runs via claude-code in `workdir`.

**The method lives in the task file, not in `task`.** Since you wrote the task file
in step 2, keep `task` SHORT — don't restate the steps/filters/queries there.
`task` is just the trigger: point the agent at the task file and state the notify
behavior. For example:

> "Read the task file `loopany/<slug>.md` (and any docs it links) and run it for
> today. Append a Log entry when done. Per its Notify section, message the user
> only when warranted; otherwise return nothing."

A bare cron carries no timezone — the server interprets it in **its own** zone
(UTC in prod), so "8am" would fire at 8am UTC, not the user's morning. Always pin
the user's IANA timezone in `timezone` so the cadence means what they said. Detect
it from this machine:

```bash
# IANA name, e.g. "Asia/Shanghai" — prefer this
readlink /etc/localtime | sed 's#.*/zoneinfo/##'        # linux/mac; falls back below if empty
[ -z "$TZ_NAME" ] && TZ_NAME="$(cat /etc/timezone 2>/dev/null)"
```

(or just ask the user their timezone if you can't resolve a clean IANA name).

Build the config as a JSON object:

```json
{
  "name": "short human name",
  "cron": "m h dom mon dow",
  "timezone": "Asia/Shanghai",
  "workflow": "<JS function body>",
  "task": "<SHORT trigger — read + run the task file, then the notify rule>",
  "workdir": "<absolute project dir>",
  "taskFile": "<absolute path to the task file from step 2>",
  "stateSchema": [{ "key": "x", "label": "X", "unit": "" }],
  "notify": "auto",
  "summary": "one short sentence describing what this loop does",
  "claim": "<connect-key>"
}
```

Rules:
- Set `claim` to the **connect-key** verbatim — it's how the web dialog learns the
  loop was created (do this even when reusing an existing machine).
- Include **either** `workflow` **or** `task` (or both, if the workflow escalates).
- Always set `workdir` and `taskFile`. Put the real instructions in the **task
  file**; keep `task` a short pointer to it (avoid duplicating content).
- Pick a sensible `cron` cadence (5 fields) and set `timezone` to the user's IANA
  zone (detected above) so the cadence fires in their local time, not the server's.
- Make the `workflow` self-contained and defensive (handle fetch failures).
- `stateSchema` is optional — declare numeric per-run metrics to get a chart.
- `notify`: `auto` (only when there's something to say) | `always` | `never`.

## 4 · Create the loop

POST the config to `<server-url>/api/machine/loop` with **this machine's device
token** as the Bearer (so the loop binds to this machine) — the `claim` field
inside carries the connect-key:

```bash
curl -sS -X POST "<server-url>/api/machine/loop" \
  -H "Authorization: Bearer $DEVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '<the JSON object from step 3>'
```

On success the response is `{ "ok": true, "id": "...", "name": "..." }`. Tell the
user the loop is created (with its name and cadence); it now appears in the
LoopAny web UI and runs on schedule. If the response has an `error`, fix the
config and retry.

## 5 · Edit an existing loop

The loop lives in two places, and you edit each where it lives:

- **Schedule / delivery envelope** (cadence, name, timezone, notify, model, pause)
  — the server owns it. Use the `loopany` CLI; it reuses this machine's persisted
  device token, so no auth or flags are needed.
- **What the loop does** (its instructions, context, log) — that's the loop's
  **task file (`task.md`) on this machine**. Just edit that file directly in the
  repo. It syncs back to the server on the loop's next run; nothing else to do.

First find the loop id (only loops bound to THIS machine are listed):

```bash
loopany loops
# -> loop-xxxx  on      0 8 * * *  Asia/Shanghai  Cookie Daily Breakfast Report
#    loop-yyyy  paused  0 * * * *                 Hourly metrics
```

Then change the envelope (pass only what changes):

```bash
loopany edit <loop-id> --cron "0 9 * * *"      # reschedule (5-field cron)
loopany edit <loop-id> --tz "America/New_York"  # change the timezone
loopany edit <loop-id> --name "New name" --notify always
loopany edit <loop-id> --pause                  # or --resume
loopany edit <loop-id> --run-at 2h              # one extra run in 2h, then resume cadence
```

It prints `updated <name> — <fields>` on success, or `loopany: <error>` to fix.
You can only edit loops bound to this machine; if `loopany loops` doesn't list it,
the user is on a different machine than the one running the loop.

> Pausing, deleting, or running a loop now are also one-click in the LoopAny web
> dashboard — point the user there for those rather than the CLI if they prefer.
