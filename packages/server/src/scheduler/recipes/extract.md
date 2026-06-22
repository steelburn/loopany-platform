---
name: extract
label: "Extract & summarize"
desc: "Periodically extract or summarize content from a source and record it"
tags: [extract, agentic, case1]
slots:
  - {name: what, prompt: "Extract/summarize what, from where? (one line, e.g. collect the titles of new posts in the blog dir)", required: true}
  - {name: workdir, prompt: "Which project directory does it run in? (the source and context live here — the agent goes in and fetches)", required: true, kind: workdir}
  - {name: cadence, prompt: "How often should it run? (optional — default daily at 9am)", kind: cron, default: "0 9 * * *"}
---
You're helping the user build an "Extract & summarize" loop (Case 1). This work is always agentic — reading and summarizing content can't be reduced to a script. You only need two hard facts: what to summarize ({what}) and where it runs ({workdir}). The source and how to fetch it don't need spelling out — the workdir is the context, and the coding agent goes in and finds it.

Compile the intent into a Job:

- No `workflow` — the summarizing is the agent's job every tick.
- Bind `exec` (executor=claude), `workdir` = {workdir}.
- Leave `taskFile` unset — c0 auto-assigns the loop's memory/log. Set it only if the user named a specific path.
- `allowControl` defaults to false (fixed cadence). `notify` defaults to `auto` (interrupt only when there's something new).
- `cron`: per {cadence}, default daily at 09:00.
