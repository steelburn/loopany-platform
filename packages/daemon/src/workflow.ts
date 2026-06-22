/**
 * Workflow runner (machine-side) — the cheap, deterministic gate. Runs the
 * loop's JS in a separate `node` subprocess (real isolation + wall-clock
 * timeout), with the previous cursor injected as `prev` and global `fetch`
 * available. Zero LLM by itself; the script opts into the expensive path by
 * calling the injected `agent()`. Ported from c0's scheduler/workflow.ts.
 *
 * Script contract:
 *   - return "text" or { message?, state? } → `message` is the direct message to
 *     the user (no claude); `state` is the persisted cursor (passed back as `prev`).
 *   - agent(message?, data?) → request escalation to claude (handled by the runner
 *     after the script finishes; the task + message + data become claude's context).
 *   - return nothing and never call agent() → silent tick.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runProcess } from "./spawn.js";

export interface AgentCall {
  message?: string;
  data?: unknown;
}

export interface WorkflowResult {
  message?: string;
  state?: unknown;
  agentCalls: AgentCall[];
}

export interface WorkflowRun {
  ok: boolean;
  result?: WorkflowResult;
  error?: string;
  stdout: string;
  stderr: string;
}

const TIMEOUT_MS = (Number(process.env.LOOPANY_WORKFLOW_TIMEOUT_SECONDS) || 30) * 1000;

function buildWrapper(body: string, prevState: unknown): string {
  const prevLiteral = JSON.stringify(JSON.stringify(prevState ?? null));
  return `import { writeFileSync } from "node:fs";
const __OUT = process.env.LOOPANY_WORKFLOW_OUT;
const prev = JSON.parse(${prevLiteral});
const __agentCalls = [];
const agent = (message, data) => {
  __agentCalls.push(data === undefined ? { message } : { message, data });
};
const __run = async (prev) => {
${body}
};
__run(prev)
  .then((out) => {
    const result = typeof out === "string" ? { message: out } : (out ?? {});
    writeFileSync(__OUT, JSON.stringify({ ...result, agentCalls: __agentCalls }));
  })
  .catch((e) => { console.error(e && e.stack ? e.stack : String(e)); process.exit(1); });
`;
}

export async function runWorkflow(body: string, prevState: unknown, cwd: string, signal?: AbortSignal): Promise<WorkflowRun> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loopany-workflow-"));
  const scriptPath = path.join(dir, "workflow.mjs");
  const outPath = path.join(dir, "out.json");

  await fs.writeFile(scriptPath, buildWrapper(body, prevState), "utf-8");
  try {
    const res = await runProcess(process.execPath, [scriptPath], {
      cwd,
      env: { ...process.env, LOOPANY_WORKFLOW_OUT: outPath },
      signal,
      timeoutMs: TIMEOUT_MS,
    });
    const logs = { stdout: res.stdout, stderr: res.stderr };

    if (res.timedOut) return { ok: false, error: `workflow timed out (>${TIMEOUT_MS / 1000}s)`, ...logs };
    if (res.code !== 0) return { ok: false, error: `workflow exited with code ${res.code}`, ...logs };

    let raw: string;
    try {
      raw = await fs.readFile(outPath, "utf-8");
    } catch {
      return { ok: false, error: "workflow did not write a result", ...logs };
    }
    let parsed: WorkflowResult;
    try {
      parsed = JSON.parse(raw) as WorkflowResult;
    } catch {
      return { ok: false, error: "workflow result is not valid JSON", ...logs };
    }
    if (parsed.message !== undefined && typeof parsed.message !== "string") {
      return { ok: false, error: "workflow `message` must be a string", ...logs };
    }
    return { ok: true, result: parsed, ...logs };
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
