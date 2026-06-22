import os from "node:os";
import path from "node:path";

/**
 * LoopAny server data directory — holds the SQLite database (and any other
 * server-side state). On Fly this is the mounted volume; locally it defaults to
 * `~/.loopany`. Override with `LOOPANY_DATA_DIR`.
 */
export function dataDir(): string {
  return process.env.LOOPANY_DATA_DIR?.trim() || path.join(os.homedir(), ".loopany");
}

/** Absolute path to the SQLite database file. */
export function dbPath(): string {
  return process.env.LOOPANY_DB_PATH?.trim() || path.join(dataDir(), "loopany.db");
}
