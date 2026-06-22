/**
 * Machine + run token helpers. Device tokens identify a machine (its id is
 * derived from the token: `m-sha256(token)[:16]`, BYOA §2). Run tokens are
 * minted per delivery, bound to one run, held in-process, and revoked when the
 * run finishes — the agent-api authorizes the `loopany` shim against them.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { RunRole } from "../db/schema.js";

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/** Mint a fresh device token (`dk_…`) — the one wire format `machineIdFromToken` consumes. */
export function mintDeviceToken(): string {
  return `dk_${randomBytes(15).toString("hex")}`;
}

/** Derive the stable machine id from its device token. */
export function machineIdFromToken(token: string): string {
  return `m-${sha256(token).slice(0, 16)}`;
}

// ---- device-token ownership (for the self-register path) ----
// When the gate is on, a freshly-minted device token belongs to the user who
// minted it. createMachine persists that on the row directly; the AI-First
// claim path mints a bare token (no row), so we remember the owner here until
// the daemon's first poll self-registers the machine under it. In-memory: a
// restart before that first poll just falls back to a shared (unowned) machine.
const deviceOwners = new Map<string, string>();

/** Record the owner of a device token (keyed by its derived machine id). */
export function setDeviceOwner(machineId: string, userId: string): void {
  deviceOwners.set(machineId, userId);
}

/** The remembered owner of a self-registering machine, if any. */
export function getDeviceOwner(machineId: string): string | undefined {
  return deviceOwners.get(machineId);
}

export interface RunSlot {
  runId: string;
  loopId: string;
  machineId: string;
  role: RunRole;
  allowControl: boolean;
  canSetUi?: boolean;
  canSetSchema?: boolean;
  canSetWorkflow?: boolean;
}

const slots = new Map<string, RunSlot>();

export function registerRunToken(slot: RunSlot): string {
  const token = randomUUID();
  slots.set(token, slot);
  return token;
}

export function resolveRunToken(token: string): RunSlot | undefined {
  return slots.get(token);
}

export function revokeRunToken(token: string): void {
  slots.delete(token);
}

// ---- claim tokens (New-loop correlation) ----
// The web mints a claim token and waits on it; Claude Code passes it as `claim`
// when it POSTs the loop, so the web learns which loop was created without
// knowing (or picking) the machine. In-memory: a server restart mid-wait just
// times the dialog out (the loop is still created + visible on the dashboard).

export interface ClaimResult {
  loopId: string;
  name: string;
  machineId: string;
}

const claimResults = new Map<string, ClaimResult>();

export function fulfillClaim(token: string, result: ClaimResult): void {
  claimResults.set(token, result);
}

/** Read-and-consume: the dialog polls until it sees the result once, then closes —
 *  so we evict on first read to keep the map from growing one dead entry per loop. */
export function readClaim(token: string): ClaimResult | undefined {
  const r = claimResults.get(token);
  if (r) claimResults.delete(token);
  return r;
}
