/**
 * Server boot — idempotent one-time init of the in-process backend: apply
 * migrations, wire the machine gateway's dispatcher into the Scheduler, start
 * the Scheduler + an offline-sweep interval. Guarded on `globalThis` so it
 * survives dev HMR and runs at most once per process. Call `ensureServer()`
 * from any server-side entry (the standalone machine server / TanStack server
 * fns); the first call boots, the rest share the same instance.
 */
import { runMigrations } from "../db/index.js";
import { logger } from "../logger.js";
import { MachineGateway, ONLINE_TTL_MS } from "../gateway/index.js";
import { gcIntervalMs } from "../env.js";
import { Scheduler, type Dispatcher } from "../scheduler/index.js";

interface Booted {
  scheduler: Scheduler;
  gateway: MachineGateway;
  abort: AbortController;
}

const g = globalThis as unknown as { __loopanyBooted?: Booted };

export function ensureServer(): Booted {
  if (g.__loopanyBooted) return g.__loopanyBooted;
  runMigrations();

  const abort = new AbortController();
  // Break the scheduler↔gateway cycle: the scheduler holds a thin dispatcher
  // that delegates to the gateway (assigned before any tick can fire).
  let gateway: MachineGateway;
  const dispatcher: Dispatcher = { dispatch: () => gateway.dispatcher.dispatch() };
  const scheduler = new Scheduler(dispatcher);
  gateway = new MachineGateway(scheduler);

  scheduler.start(abort.signal);

  const sweep = setInterval(() => gateway.sweep(), ONLINE_TTL_MS);
  sweep.unref?.();
  abort.signal.addEventListener("abort", () => clearInterval(sweep), { once: true });

  // Storage maintenance (prune snapshots → GC unreferenced blob bytes) on its own
  // slower cadence — keeps R2 from growing monotonically. Async + best-effort, so a
  // slow R2 delete can't block the loop; void the promise (the method never throws).
  const gc = setInterval(() => void gateway.maintainStorage(), gcIntervalMs());
  gc.unref?.();
  abort.signal.addEventListener("abort", () => clearInterval(gc), { once: true });

  g.__loopanyBooted = { scheduler, gateway, abort };
  logger.info("loopany server booted");
  return g.__loopanyBooted;
}

export function getScheduler(): Scheduler {
  return ensureServer().scheduler;
}

export function getGateway(): MachineGateway {
  return ensureServer().gateway;
}
