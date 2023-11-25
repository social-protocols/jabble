// drizzle.config.ts
import type { Config } from "drizzle-kit";
import process from "process";

export default {
  schema: "app/schema.ts",
  out: "./migrations",
  driver: "better-sqlite",
  dbCredentials: {
    url: process.env.DATABASE_PATH
    // url: "./local.db",
  },
  verbose: true,
  strict: true,
} satisfies Config;