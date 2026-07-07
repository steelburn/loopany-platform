#!/usr/bin/env node
// Pre-start migration gate.
//
// HOSTED Postgres tier (DATABASE_URL set): apply pending migrations here via
// drizzle-kit over the DIRECT (:5432) URL, so a bad migration fails the deploy
// LOUDLY (before the server serves) rather than at first request.
//
// Embedded pglite tier (no DATABASE_URL — local dev / light self-host): the
// database migrates IN-PROCESS at boot (db/index.ts `runMigrations`), and
// `drizzle-kit migrate` has no URL to target, so we SKIP it here. Running it
// unconditionally would fail the pglite tier's `pnpm start`.
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("[prestart] no DATABASE_URL — embedded pglite migrates in-process at boot; skipping drizzle-kit migrate");
  process.exit(0);
}

const r = spawnSync("drizzle-kit", ["migrate"], { stdio: "inherit", shell: true });
process.exit(r.status ?? 1);
