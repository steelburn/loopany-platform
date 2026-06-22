---
name: monitor
label: "Metric monitor"
desc: "Watch one metric — minimal detection and notification"
tags: [monitor, graduates, case3]
slots:
  - {name: watch, prompt: "Which metric, and what counts as anomalous? (one line, e.g. subscription MRR drops 10% week-over-week)", required: true}
  - {name: workdir, prompt: "Which project directory does it run in? (the loop's context lives here — the agent goes in and pulls the number)", required: true, kind: workdir}
  - {name: cadence, prompt: "How often should it check? (optional — default daily at 9am)", kind: cron, default: "0 9 * * *"}
---
You're helping the user build a "Metric monitor" loop. You only need two hard facts: what to watch and what counts as anomalous ({watch}), and where it runs ({workdir}). How to pull the number doesn't need spelling out — the workdir is the loop's whole context, and the coding agent works out how to get the metric.

Compile the intent into a Job:

- Bind `exec` (executor=claude), `workdir` = {workdir}. Agentic by nature: the fetch method for {watch} is unknown up front, so the agent probes workdir (code / config / SQL / API / logs) to figure it out.
- Leave `taskFile` unset — c0 auto-assigns the loop's memory (baseline + history + the fetch method it learns). Set it only if the user named a specific path.
- Usually don't pre-write a `workflow`: the fetch method is unknown, so anything you write is a guess. Author one only if the user's description already gives a directly-runnable method (a concrete SQL query / API call).
- `allowControl` defaults to true — note the graduation path: once the agent has nailed a reliable, cheap fetch method, it uses `loop set-workflow` to harden the frequent check into a zero-LLM gate (return { state } when normal, call agent() only past the threshold), graduating itself.
- Declare `stateSchema`: list the numeric metrics in {watch} as `[{key,label,unit}]`, so each tick the agent can `loop report --state '{...}'` them and they auto-plot on the trend chart. List one per value you watch.
- `notify` defaults to `auto` (no interrupts when silent). `cron`: per {cadence}, default daily at 09:00.
