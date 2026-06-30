/**
 * Builds the exec-loop standing system prompt + per-run task on the SERVER, to
 * ship inside a delivery (the machine just writes the prompt to a file and runs
 * claude with it). Ported from c0's loop-prompt.ts, bound to the new Loop row
 * and the renamed `loopany` CLI. Prompt prose lives as markdown loaded +
 * `{{token}}`-filled here. ALL prompt prose now lives under src/skill/: the public
 * authoring trio (create/update/evolve) in skill/references/, and the INTERNAL
 * run prompts (exec-loop, edit) in skill/run/ — server-side run-dispatch only,
 * never served or bundled. The `evolve` text is the SINGLE source of truth shared
 * with the installable agent skill (skill/references/evolve.md) — run-dispatch and
 * the skill read the same file, so the evolution guidance can't drift. `edit` is a
 * run-token verb prompt with no authoring twin (see skill/references/update.md for
 * the authoring CLI). The on/off self-schedule variants are folded into exec-loop
 * as one delimited block; `resolveControl()` keeps the applicable variant and drops
 * the other, so an allowControl=false loop never sees the schedule verbs.
 */
import type { Loop, Run, StateField } from "../db/schema.js";

// Inlined at build time (Vite ?raw) so the prompt prose ships inside the nitro
// bundle. Reading them from disk at runtime broke in prod: nitro bundles JS only,
// so the `*.md` source files don't exist under .output and poll() threw ENOENT.
// `?raw` resolves identically from skill/run/ as it did from scheduler/prompts/.
import execLoop from "../skill/run/exec-loop.md?raw";
import evolve from "../skill/references/evolve.md?raw";
import edit from "../skill/run/edit.md?raw";

const PROMPTS: Record<string, string> = {
  "exec-loop": execLoop,
  evolve,
  edit,
};

function loadPrompt(name: string): string {
  const v = PROMPTS[name];
  if (v === undefined) throw new Error(`unknown prompt: ${name}`);
  return v.trim();
}

// The exec-loop prompt folds BOTH self-schedule variants into one delimited block:
//   <!-- control:on -->…on text…<!-- control:off -->…off text…<!-- /control -->
// Keep the applicable variant (trimmed, verbatim) and drop the markers + the other
// variant. This preserves the off-path terseness: an allowControl=false loop's
// assembled prompt contains ONLY the "may not change your schedule" line — never the
// reschedule/set-cron/pause/resume/notify verbs. Byte-equivalent to the former
// `{{controlSection}}` ← control-on.md / control-off.md substitution.
const CONTROL_BLOCK = /<!-- control:on -->\n([\s\S]*?)\n<!-- control:off -->\n([\s\S]*?)\n<!-- \/control -->/;

function resolveControl(text: string, allowControl: boolean): string {
  return text.replace(CONTROL_BLOCK, (_m, on: string, off: string) => (allowControl ? on : off).trim());
}

function fillVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? m);
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
  const execText = resolveControl(loadPrompt("exec-loop"), !!loop.allowControl);
  return fillVars(execText, { name, taskFile, stateLine });
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
