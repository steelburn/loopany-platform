/**
 * Shared subprocess runner: spawn, collect stdout/stderr, honor an AbortSignal
 * (SIGTERM→SIGKILL), enforce a wall-clock timeout. Ported from c0's handoff
 * spawn.ts. Task text goes via argv; stdin is unused.
 */
import { spawn } from "node:child_process";

export interface SpawnResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

const KILL_GRACE_MS = 5_000;
const STREAM_DRAIN_MS = 1_000;
/** When a streaming consumer (onStdout) handles output live, we only retain a
 *  bounded tail for the error-fallback path — stream-json --verbose can be MBs. */
const STDOUT_TAIL_CAP = 64_000;

export interface SpawnOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Called with each stdout chunk as it arrives (for live/streamed parsing). */
  onStdout?: (chunk: string) => void;
}

export function runProcess(command: string, args: string[], opts: SpawnOptions): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let killTimer: NodeJS.Timeout | undefined;

    const terminate = () => {
      child.kill("SIGTERM");
      killTimer ??= setTimeout(() => child.kill("SIGKILL"), KILL_GRACE_MS);
    };

    const onAbort = () => terminate();
    if (opts.signal) {
      if (opts.signal.aborted) terminate();
      else opts.signal.addEventListener("abort", onAbort, { once: true });
    }

    let timer: NodeJS.Timeout | undefined;
    if (opts.timeoutMs && opts.timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        terminate();
      }, opts.timeoutMs);
    }

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      opts.signal?.removeEventListener("abort", onAbort);
    };

    child.stdout.on("data", (d) => {
      const s = d.toString();
      if (opts.onStdout) {
        opts.onStdout(s); // consumer parses live; keep only a bounded tail for errors
        stdout = (stdout + s).slice(-STDOUT_TAIL_CAP);
      } else {
        stdout += s;
      }
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      cleanup();
      reject(err);
    });

    let settled = false;
    const settle = (code: number | null, sig: NodeJS.Signals | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ code, signal: sig, stdout, stderr, timedOut });
    };
    child.on("close", (code, sig) => settle(code, sig));
    child.on("exit", (code, sig) => {
      setTimeout(() => settle(code, sig), STREAM_DRAIN_MS).unref();
    });
  });
}

/** Allowlisted env for the claude subprocess — never inherit unrelated secrets. */
export function execEnv(): NodeJS.ProcessEnv {
  const allow = [
    "PATH", "HOME", "SHELL", "USER", "LOGNAME", "TMPDIR", "TZ",
    "LANG", "LC_ALL", "LC_CTYPE", "TERM",
    "ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN",
    "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY", "ALL_PROXY",
    "SSL_CERT_FILE", "SSL_CERT_DIR", "NODE_EXTRA_CA_CERTS", "XDG_CONFIG_HOME",
  ];
  const env: NodeJS.ProcessEnv = {};
  for (const k of allow) {
    if (process.env[k] !== undefined) env[k] = process.env[k];
  }
  return env;
}
