/**
 * Artifact-storage retention + garbage collection — the policy that keeps R2
 * (and the in-memory dev/test store) from growing monotonically.
 *
 * The artifact pipeline is content-addressed: blob BYTES are keyed by sha256 and
 * deduped across every loop/run. When a path is deleted or its content changes,
 * the OLD blob is no longer pointed at by the current file row — but nothing was
 * reclaiming it, so R2 grew forever. This module closes that gap with two pieces:
 *
 *   1. pruneSnapshots() — bound the per-loop run-snapshot history to a window, so
 *      old snapshots stop pinning the blobs they referenced for diffs.
 *   2. gcBlobs()        — delete blob bytes no LIVE row needs: a blob is collected
 *      only when NO artifact_files row AND NO retained run_snapshot references its
 *      hash. CORRECTNESS over aggressiveness — a still-referenced blob is never
 *      deleted; a leaked blob is only a cost bug the next pass reclaims.
 *
 * Concurrency: gcBlobs is safe to run alongside active syncs. Two guards combine —
 * a grace window (a blob whose metadata row is younger than the window is never
 * collected, so a blob a sync just wrote/referenced is untouchable) and a final
 * point re-check of each candidate immediately before its bytes are deleted (so a
 * blob re-referenced mid-pass keeps its bytes). The metadata read + delete phase
 * is fully synchronous (better-sqlite3), so no concurrent handler interleaves with
 * the keep-set computation.
 */
import { logger } from "../logger.js";
import * as store from "../db/store.js";
import { blobGcGraceMs, snapshotRetention } from "../env.js";
import type { BlobStore } from "./blobstore.js";

const log = logger.child({ mod: "retention" });

export interface MaintainResult {
  snapshotsPruned: number;
  blobsReclaimed: number;
}

/**
 * Prune every loop's run snapshots down to the configured retention window
 * (most-recent-N). Returns the total number pruned. This is what makes an old
 * snapshot's now-unreferenced blobs collectable by gcBlobs().
 */
export function pruneSnapshots(keep: number = snapshotRetention()): number {
  let pruned = 0;
  for (const loopId of store.loopIdsWithSnapshots()) {
    pruned += store.pruneRunSnapshots(loopId, keep);
  }
  return pruned;
}

/**
 * Reclaim unreferenced blob bytes. Returns the number of blobs collected.
 *
 * Algorithm (the synchronous phase is interleave-free under the single-threaded
 * event loop, so the keep-set is consistent with the metadata deletions):
 *   1. Compute the live keep-set (all hashes any artifact_files row / retained
 *      snapshot references).
 *   2. Candidates = blobs older than the grace window (younger blobs are off-limits
 *      — a concurrent sync may be about to reference them) and not in the keep-set.
 *   3. Delete each candidate's metadata row (synchronous, no await between them).
 *   4. Then, for each, re-check referencedness one last time and — if still
 *      unreferenced — delete its bytes (the only awaits in the whole pass).
 */
export async function gcBlobs(blobStore: BlobStore, graceMs: number = blobGcGraceMs()): Promise<number> {
  const refs = store.liveBlobRefs();
  const cutoff = new Date(Date.now() - graceMs).toISOString();
  const candidates = store.blobHashesOlderThan(cutoff);

  // Phase A (synchronous, atomic wrt the event loop): pick the garbage and drop
  // its metadata rows. After this, blobExists() is false for each — so a sync that
  // re-references one will re-request the bytes (self-healing), never end up with a
  // live row pointing at deleted bytes.
  const garbage = candidates.filter((h) => !refs.has(h));
  for (const hash of garbage) store.deleteBlob(hash);

  // Phase B (async): reclaim the bytes. Re-check each hash right before deleting —
  // if a concurrent sync re-referenced it during a prior await, keep its bytes.
  let reclaimed = 0;
  for (const hash of garbage) {
    if (store.blobIsReferenced(hash)) continue; // re-referenced mid-pass → keep bytes
    try {
      await blobStore.delete(hash);
      reclaimed++;
    } catch (err) {
      // A failed byte-delete just leaks the bytes (cost bug) — the metadata row is
      // already gone, so a later pass won't even retry it; that's the safe bias.
      log.warn({ hash, err: err instanceof Error ? err.message : String(err) }, "gc: blob byte-delete failed");
    }
  }
  return reclaimed;
}

/**
 * One full storage-maintenance pass: prune snapshots, then GC the blobs they
 * freed (plus any already-unreferenced). Order matters — pruning first lets the
 * same pass reclaim the blobs it just unpinned. Idempotent and safe with no
 * garbage (returns zeros).
 */
export async function maintainStorage(blobStore: BlobStore): Promise<MaintainResult> {
  const snapshotsPruned = pruneSnapshots();
  const blobsReclaimed = await gcBlobs(blobStore);
  if (snapshotsPruned || blobsReclaimed) {
    log.info({ snapshotsPruned, blobsReclaimed }, "storage maintenance");
  }
  return { snapshotsPruned, blobsReclaimed };
}
