/**
 * Callback mode — `loopany <verb> [...flags]` invoked by claude (via the PATH
 * wrapper) inside a run. Delegates to the shared CLI client (`postCli`): it picks the
 * run token from the env, inlines the file flags, and POSTs `{argv}` to the unified
 * `/api/machine/cli`, falling back to the legacy `/agent-api/loop` on a 404 (old
 * server). This module just renders the `{text, exitCode}` reply for the agent.
 */
import { legacyRun, postCli } from "./cli-client.js";

export async function runCallback(argv: string[]): Promise<number> {
  const r = await postCli(argv, legacyRun);
  if (r.kind === "not-configured") {
    process.stderr.write("loopany: control channel not configured\n");
    return 2;
  }
  if (r.kind === "read-error") {
    process.stderr.write(`loopany: cannot read ${r.path}\n`);
    return 1;
  }
  if (r.kind === "network-error") {
    process.stderr.write(`loopany: ${r.message}\n`);
    return 1;
  }
  const data = r.body as { text?: string; exitCode?: number };
  if (data.text) process.stdout.write(data.text.endsWith("\n") ? data.text : data.text + "\n");
  return typeof data.exitCode === "number" ? data.exitCode : r.status >= 200 && r.status < 300 ? 0 : 1;
}
