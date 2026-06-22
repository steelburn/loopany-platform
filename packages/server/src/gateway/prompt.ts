/**
 * Builds the exec-loop standing system prompt + per-run task on the SERVER, to
 * ship inside a delivery (the machine just writes the prompt to a file and runs
 * claude with it). Ported from c0's loop-prompt.ts, bound to the new Loop row
 * and the renamed `loopany` CLI. Prompt prose lives as markdown under
 * scheduler/prompts/ (loaded + `{{token}}`-filled here).
 */
import type { Loop, Run, StateField } from "../db/schema.js";

// Inlined at build time (Vite ?raw) so the prompt prose ships inside the nitro
// bundle. Reading them from disk at runtime broke in prod: nitro bundles JS only,
// so `../scheduler/prompts/*.md` doesn't exist under .output and poll() threw ENOENT.
import controlOn from "../scheduler/prompts/control-on.md?raw";
import controlOff from "../scheduler/prompts/control-off.md?raw";
import execLoop from "../scheduler/prompts/exec-loop.md?raw";
import evolve from "../scheduler/prompts/evolve.md?raw";
import edit from "../scheduler/prompts/edit.md?raw";

const PROMPTS: Record<string, string> = {
  "control-on": controlOn,
  "control-off": controlOff,
  "exec-loop": execLoop,
  evolve,
  edit,
};

function loadPrompt(name: string): string {
  const v = PROMPTS[name];
  if (v === undefined) throw new Error(`unknown prompt: ${name}`);
  return v.trim();
}

function fillPrompt(name: string, vars: Record<string, string>): string {
  return loadPrompt(name).replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? m);
}

/** One-line human description of a loop's metric schema: `key (unit) — label; …`. */
function formatSchemaFields(schema: StateField[]): string {
  return schema.map((f) => `${f.key}${f.unit ? ` (${f.unit})` : ""}${f.label ? ` — ${f.label}` : ""}`).join("; ");
}

/** Standing instructions injected via `--append-system-prompt-file`. */
export function buildLoopSystemPrompt(loop: Loop): string {
  const name = loop.name || loop.id;
  const taskFile = loop.taskFile ?? "(none — work from the instruction you were given)";
  const schema = loop.stateSchema ?? [];
  const stateLine = schema.length
    ? `loopany report --status <s> --state '{${schema.map((f) => `"${f.key}":<n>`).join(",")}}'
  # record this run's metrics for the trend chart. Fields (keys must match, values must be finite numbers):
  #   ${formatSchemaFields(schema)}
  # report a subset if you only observed some; big payloads: --state-file <path>.`
    : `loopany report --status new --sample <number>     # optional single metric for charts`;
  const controlSection = loadPrompt(loop.allowControl ? "control-on" : "control-off");
  return fillPrompt("exec-loop", { name, taskFile, stateLine, controlSection });
}

/** The per-run user turn (the standing prompt carries the discipline). */
export function buildExecTask(loop: Loop): string {
  const parts = [`[loop run · ${loop.name || loop.id}]`];
  if (loop.task) parts.push(loop.task);
  parts.push(
    "Run now: follow your standing instructions — read your task file (create it if missing), do the work, maintain the file, and `loopany report`.",
  );
  return parts.join("\n\n");
}

/** Fixed internal prompt for the data-grounded evolution pass. */
export function buildEvolvePrompt(): string {
  return loadPrompt("evolve");
}

/** Standing prompt for an owner-requested edit pass (apply one change, then stop). */
export function buildEditPrompt(): string {
  return loadPrompt("edit");
}

/** The edit payload: the loop's current envelope + the owner's instruction. The
 *  current ui/schema/workflow are inlined when present so an edit can make a
 *  surgical change to them rather than blind-rewrite (mirrors the evolve task). */
export function buildEditTask(loop: Loop, instruction: string): string {
  const where = loop.timezone ? `${loop.cron} (${loop.timezone})` : `${loop.cron} (server-local)`;
  const parts = [
    `[loop edit · ${loop.name || loop.id}]`,
    `Loop id: ${loop.id}`,
    `Current schedule: ${where}`,
    `Task file: ${loop.taskFile ?? "(none yet)"}`,
  ];
  if (loop.stateSchema?.length) {
    parts.push("Current metric schema: " + formatSchemaFields(loop.stateSchema));
  }
  if (loop.ui) parts.push("Current ui:\n```html\n" + loop.ui + "\n```");
  if (loop.workflow) parts.push("Current workflow:\n```js\n" + loop.workflow + "\n```");
  parts.push(
    `The owner wants this change:\n${instruction.trim()}`,
    "Apply it now per your instructions, then report a one-line summary of what you changed.",
  );
  return parts.join("\n\n");
}

/** The evolution payload: current loop shape + recent observed runs. */
export function buildEvolveTask(loop: Loop, runs: Run[]): string {
  const schema = loop.stateSchema?.length ? formatSchemaFields(loop.stateSchema) : "(none declared)";
  // Per-run metadata: what it reported, plus the `session` id that lets the agent
  // pull that run's FULL on-disk transcript on demand (richer than anything we
  // could inline) — see the standing evolve instructions.
  const recent = runs.map((r) => ({
    ts: r.ts,
    outcome: r.outcome,
    status: r.status,
    sample: r.sample,
    state: r.state,
    message: r.message,
    session: r.sessionId ?? null,
  }));
  return [
    `[loop evolution · ${loop.name || loop.id}]`,
    `Task file: ${loop.taskFile ?? "(none)"}`,
    `Metric schema: ${schema}`,
    "Current ui:\n" + (loop.ui ? "```html\n" + loop.ui + "\n```" : "(none yet — author one if the data warrants it)"),
    "Current workflow:\n" + (loop.workflow ? "```js\n" + loop.workflow + "\n```" : "(none)"),
    "Recent runs (oldest first):\n```json\n" + JSON.stringify(recent, null, 2) + "\n```",
    "Evolve this loop per your instructions: refine the UI to fit the real data, and improve the workflow only if the runs justify it. Do not message the user.",
  ].join("\n\n");
}
