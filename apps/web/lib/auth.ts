import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";
import { db } from "./db";
import { env } from "./env";

const resend = new Resend(env.RESEND_API_KEY);

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await resend.emails.send({
          from: "Lume <onboarding@resend.dev>",
          to: email,
          subject: "Sign in to Lume",
          html: `<p>Click <a href="${url}">here</a> to sign in. Link expires in 10 minutes.</p>`,
        });
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
