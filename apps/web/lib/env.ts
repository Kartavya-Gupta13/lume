import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  RESEND_API_KEY: z.string().min(1),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(`Missing required env vars: ${missing}`);
}

export const env = parsed.data;
