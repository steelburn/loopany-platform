/**
 * Callback mode — `loopany <verb> [...flags]` invoked by claude (via the PATH
 * wrapper) inside a run. Inlines file flags so big bodies survive shell+JSON,
 * then forwards argv to the server's /agent-api/loop with the run token.
 */
import fs from "node:fs";

const FILE_FLAGS: Record<string, string> = {
  "--message-file": "--message",
  "--state-file": "--state-content",
  "--file": "--file-content",
};

export async function runCallback(argv: string[]): Promise<number> {
  const token = process.env.LOOPANY_RUN_TOKEN;
  const server = process.env.LOOPANY_SERVER_URL;
  if (!token || !server) {
    process.stderr.write("loopany: control channel not configured\n");
    return 2;
  }

  const out = [...argv];
  for (let i = 0; i < out.length - 1; i++) {
    const repl = FILE_FLAGS[out[i]!];
    if (repl) {
      try {
        out[i + 1] = fs.readFileSync(out[i + 1]!, "utf8");
        out[i] = repl;
      } catch {
        process.stderr.write(`loopany: cannot read ${out[i + 1]}\n`);
        return 1;
      }
    }
  }

  try {
    const res = await fetch(`${server.replace(/\/$/, "")}/agent-api/loop`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ argv: out }),
    });
    const data = (await res.json().catch(() => ({}))) as { text?: string; exitCode?: number };
    if (data.text) process.stdout.write(data.text.endsWith("\n") ? data.text : data.text + "\n");
    return typeof data.exitCode === "number" ? data.exitCode : res.ok ? 0 : 1;
  } catch (err) {
    process.stderr.write(`loopany: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }
}
