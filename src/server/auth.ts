import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { and, eq } from "drizzle-orm";
import { db } from "~/server/db";
import * as schema from "~/server/db/schema";
import { auditLog, cmsSite } from "~/server/db/schema";
import { env } from "~/env";
import { sendAccountEmail } from "~/lib/email";
import { twoFactor } from "better-auth/plugins";

async function trustedSiteOrigins() {
  const origins = new Set([new URL(env.BETTER_AUTH_URL).origin]);
  const sites = await db
    .select({ hostname: cmsSite.hostname })
    .from(cmsSite)
    .where(
      and(eq(cmsSite.domainStatus, "verified"), eq(cmsSite.status, "active")),
    );
  for (const site of sites) {
    if (site.hostname) origins.add(`https://${site.hostname}`);
  }
  return [...origins];
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      twoFactor: schema.twoFactor,
    },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    sendResetPassword: async ({ user, url }) => {
      await sendAccountEmail({
        to: user.email,
        subject: "Reset your hadlockCMS password",
        text: `Reset your password using this secure link:\n${url}\n\nThis link expires in one hour.`,
        html: `<p>Reset your hadlockCMS password using the link below.</p><p><a href="${url}">Reset password</a></p><p>This link expires in one hour.</p>`,
      });
    },
  },
  rateLimit: { enabled: true, window: 60, max: 20 },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: trustedSiteOrigins,
  plugins: [twoFactor({ issuer: "hadlockCMS" })],
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          // Find the user's email for the log entry
          const u = db
            .select({ email: schema.user.email })
            .from(schema.user)
            .where(
              eq(schema.user.id, session.userId),
            )
            .get();
          await db.insert(auditLog).values({
            siteId: "platform",
            userId: session.userId,
            userEmail: u?.email,
            action: "auth.login",
            entity: "session",
            detail: u?.email ? `Signed in as ${u.email}` : "Session created",
          });
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
