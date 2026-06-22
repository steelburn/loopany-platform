import os from "node:os";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

// Mirrors src/env.ts dbPath() so drizzle-kit and the app target the same file.
const dbFile =
  process.env.LOOPANY_DB_PATH?.trim() ||
  path.join(process.env.LOOPANY_DATA_DIR?.trim() || path.join(os.homedir(), ".loopany"), "loopany.db");

export default defineConfig({
  dialect: "sqlite",
  schema: ["./src/db/schema.ts", "./src/db/auth-schema.ts"],
  out: "./drizzle",
  dbCredentials: { url: dbFile },
});
