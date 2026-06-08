import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index";

// For Next.js (Node runtime). Uses postgres package over TCP.
// DATABASE_URL should include ?pgbouncer=true for serverless functions.
export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl, { prepare: false });
  return drizzlePostgres(client, { schema });
}

// For Cloudflare Workers (edge runtime). Uses Neon serverless HTTP transport.
// TCP connections are unavailable in the Workers runtime.
export function createDbEdge(databaseUrl: string) {
  const client = neon(databaseUrl);
  return drizzleNeon(client, { schema });
}

export * from "./schema/index";
