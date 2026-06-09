import { config } from "dotenv";
import type { Config } from "drizzle-kit";

// Load from monorepo root .env.local first, then fall back to process env
config({ path: "../../.env.local" });

if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL is required for migrations");
}

export default {
  schema: "./src/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"],
  },
} satisfies Config;
