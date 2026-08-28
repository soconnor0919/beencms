/**
 * Neutral platform seed.
 *
 * Creates a platform administrator and one blank, onboarding-ready site. Client
 * data belongs in a dedicated provisioning package under clients/.
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../src/server/db/schema";

const DB_PATH = process.env.DATABASE_URL ?? "db.sqlite";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@hadlock.tech";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
const SITE_ID = process.env.SEED_SITE_ID ?? "default";
const SITE_NAME = process.env.SEED_SITE_NAME ?? "My Site";

const sqlite = new Database(DB_PATH);
const db = drizzle(sqlite, { schema });
const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: { enabled: true },
  secret:
    process.env.BETTER_AUTH_SECRET ?? "seed-secret-at-least-32-chars-long!!",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
});

try {
  await auth.api.signUpEmail({
    body: {
      name: "Platform Admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  });
  console.log(`✓ Platform administrator created: ${ADMIN_EMAIL}`);
} catch (error) {
  console.log(
    `Platform administrator already exists: ${(error as Error).message}`,
  );
}

const adminUser = db
  .select()
  .from(schema.user)
  .where(eq(schema.user.email, ADMIN_EMAIL))
  .get();

if (!adminUser)
  throw new Error(`Unable to provision administrator ${ADMIN_EMAIL}`);

db.insert(schema.userProfile)
  .values({
    userId: adminUser.id,
    role: "admin",
    displayName: "Platform Admin",
  })
  .onConflictDoNothing()
  .run();
db.insert(schema.cmsSite)
  .values({ id: SITE_ID, name: SITE_NAME, slug: SITE_ID })
  .onConflictDoNothing()
  .run();
db.insert(schema.siteMembership)
  .values({ siteId: SITE_ID, userId: adminUser.id, role: "owner" })
  .onConflictDoNothing()
  .run();
db.insert(schema.siteSubscription)
  .values({ siteId: SITE_ID, plan: "free", status: "none" })
  .onConflictDoNothing()
  .run();
db.insert(schema.analyticsSettings)
  .values({ siteId: SITE_ID, enabled: true, retentionDays: 90 })
  .onConflictDoNothing()
  .run();
db.insert(schema.siteSettings)
  .values({
    siteId: SITE_ID,
    siteName: SITE_NAME,
    themePreset: "foundation",
    primaryColor: "#0076a0",
    accentColor: "#f4f1ea",
    textColor: "#171716",
    bodyFont: "Geist",
    headingFont: "Rajdhani",
    navLinks: "[]",
    socialLinks: "[]",
    onboardingComplete: false,
  })
  .onConflictDoNothing()
  .run();

console.log(`✓ Blank onboarding site created: ${SITE_NAME} (${SITE_ID})`);
console.log(
  `\nAdmin login:\n  Email:    ${ADMIN_EMAIL}\n  Password: ${ADMIN_PASSWORD}\n`,
);
console.log(
  "Change the development password before using this account outside local development.",
);

sqlite.close();
