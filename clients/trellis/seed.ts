/**
 * Trellis client provisioner.
 * Usage: bun run db:seed:trellis
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { and, eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../../src/server/db/schema";

const DB_PATH = process.env.DATABASE_URL ?? "db.sqlite";
const SITE_ID = "trellis";
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

// ─── Admin user ───────────────────────────────────────────────────────────────
const ADMIN_EMAIL = process.env.TRELLIS_OWNER_EMAIL ?? "admin@trelliswd.org";
const ADMIN_PASSWORD = process.env.TRELLIS_OWNER_PASSWORD ?? "ChangeMe123!";

console.log("Creating admin user:", ADMIN_EMAIL);
try {
  await auth.api.signUpEmail({
    body: { name: "Admin", email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  console.log("✓ Admin user created");
} catch (e) {
  console.log("Admin user may already exist:", (e as Error).message);
}

// ─── Team members from pitch deck ─────────────────────────────────────────────
const team = [
  { name: "Charles Kim", role: "President", order: 0, isAffiliate: false },
  { name: "Vince Anselmo", role: "Secretary", order: 1, isAffiliate: false },
  { name: "Curtis Nicholls", role: "Treasurer", order: 2, isAffiliate: false },
  { name: "Billy Robel", role: "Board Member", order: 3, isAffiliate: false },
  { name: "Drew Lahr", role: "Board Member", order: 4, isAffiliate: false },
  { name: "Shawnee Robel", role: "Affiliate", order: 5, isAffiliate: true },
  { name: "Ben Herrold", role: "Affiliate", order: 6, isAffiliate: true },
];

// Only seed if no members exist
const existingMembers = db
  .select()
  .from(schema.teamMembers)
  .where(eq(schema.teamMembers.siteId, SITE_ID))
  .all();
if (existingMembers.length === 0) {
  console.log("Seeding team members...");
  for (const member of team) {
    db.insert(schema.teamMembers)
      .values({ ...member, siteId: SITE_ID })
      .run();
  }
  console.log(`✓ ${team.length} team members`);
} else {
  console.log("Team members already exist, skipping.");
}

// ─── Initial companies ────────────────────────────────────────────────────────
const companies = [
  {
    name: "Trellis Auto Repair",
    slug: "auto-repair",
    tagline: "Quality repairs. Meaningful work.",
    description:
      "Our flagship enterprise, launching mid-2025. Trainees work alongside certified mechanics using an apprenticeship model — gaining real skills while earning a wage.",
    status: "active" as const,
    order: 0,
  },
  {
    name: "Trellis Auto Detailing",
    slug: "auto-detailing",
    tagline: "Pride in the details.",
    description:
      "Launching in Year 2, Trellis Auto Detailing gives trainees hands-on experience in a growing trade with clear career pathways.",
    status: "coming_soon" as const,
    order: 1,
  },
  {
    name: "Trellis Contracting",
    slug: "contracting",
    tagline: "Building more than structures.",
    description:
      "General contracting and handyman services, also launching in Year 2. Trainees gain construction skills and professional work-site habits.",
    status: "coming_soon" as const,
    order: 2,
  },
];

const existingCompanies = db
  .select()
  .from(schema.companies)
  .where(eq(schema.companies.siteId, SITE_ID))
  .all();
if (existingCompanies.length === 0) {
  console.log("Seeding companies...");
  for (const company of companies) {
    db.insert(schema.companies)
      .values({ ...company, siteId: SITE_ID })
      .run();
  }
  console.log(`✓ ${companies.length} companies`);
} else {
  console.log("Companies already exist, skipping.");
}

// ─── Page content defaults ────────────────────────────────────────────────────
const pageContentDefaults = [
  // home
  {
    page: "home",
    key: "hero_title",
    value: "Growing People. Building Futures.",
  },
  {
    page: "home",
    key: "hero_body",
    value:
      "Trellis Workforce Development creates meaningful employment and life-skills training for people in recovery — helping them build stable, purposeful lives.",
  },
  {
    page: "home",
    key: "problem_body",
    value:
      "Those in recovery face incredible challenges in acquiring gainful employment. When they do find jobs, they are often in industries with little skill training and demanding schedules — not conducive to recovery, spiritual growth, or building life skills.",
  },
  {
    page: "home",
    key: "solution_body",
    value:
      "Trellis operates fee-for-service businesses — auto repair, detailing, contracting and more — where recovering individuals receive paid work, mentorship, and structured life-skills training. Graduates transition into mainstream employment after 12–15 months.",
  },
  { page: "home", key: "cta_title", value: "Partner With Us" },
  {
    page: "home",
    key: "cta_body",
    value:
      "Whether you're a business looking to hire, a donor wanting to invest in community change, or someone in recovery seeking opportunity — we want to hear from you.",
  },
  // about
  { page: "about", key: "hero_title", value: "Our Mission" },
  {
    page: "about",
    key: "hero_body",
    value:
      "Trellis Workforce Development was founded by a community of faith to create meaningful, structured employment for people recovering from addiction — while building the life skills they need to thrive long-term.",
  },
  {
    page: "about",
    key: "why_body",
    value:
      "People in recovery face incredible obstacles to stable employment. The jobs they can find often involve little training and demanding schedules that leave no room for the recovery work, spiritual growth, and skill-building that leads to lasting change. Trellis exists to close that gap.",
  },
  {
    page: "about",
    key: "how_body",
    value:
      "We operate real, revenue-generating businesses — starting with auto repair — where trainees work alongside skilled mentors using an apprenticeship model. Trellis controls hours and environment, keeping workdays to 5–6 hours with dedicated time for training and personal development. Graduates ideally enter mainstream employment after 12–15 months.",
  },
  { page: "about", key: "faith_title", value: "Rooted in Faith" },
  {
    page: "about",
    key: "faith_body",
    value:
      "Trellis was founded through Christ-Way Church and is guided by the belief that every person has dignity, purpose, and the capacity for transformation. Our approach integrates vocational opportunity with spiritual support and community.",
  },
  // donate
  { page: "donate", key: "hero_title", value: "Invest in Recovery" },
  {
    page: "donate",
    key: "hero_body",
    value:
      "Your gift helps create jobs, restore dignity, and build a path forward for people in recovery. Trellis has filed for 501(c)(3) status — donations are tax-deductible upon approval.",
  },
  {
    page: "donate",
    key: "giving_note",
    value:
      "We're setting up secure online giving. In the meantime, please reach out to us directly to make a donation or discuss a gift.",
  },
];

// Insert each row only if that (page, key) doesn't already exist.
// If a row exists with an empty value (orphaned draft row), back-fill the default.
let contentInserted = 0;
for (const row of pageContentDefaults) {
  const existing = db
    .select()
    .from(schema.pageContent)
    .where(
      and(
        eq(schema.pageContent.siteId, SITE_ID),
        eq(schema.pageContent.page, row.page),
        eq(schema.pageContent.key, row.key),
      ),
    )
    .get();
  if (!existing) {
    db.insert(schema.pageContent)
      .values({ ...row, siteId: SITE_ID })
      .run();
    contentInserted++;
  } else if (existing.value === "") {
    db.update(schema.pageContent)
      .set({ value: row.value })
      .where(
        and(
          eq(schema.pageContent.siteId, SITE_ID),
          eq(schema.pageContent.page, row.page),
          eq(schema.pageContent.key, row.key),
        ),
      )
      .run();
    contentInserted++;
  }
}
if (contentInserted > 0) {
  console.log(`✓ ${contentInserted} page content rows seeded`);
} else {
  console.log("Page content already exists, skipping.");
}

// ─── Page layout blocks ──────────────────────────────────────────────────────
// Each page's block structure is stored as JSON in pageLayout table.

const lifeskillsHtml =
  "<p>Every trainee participates in structured life-skills development alongside their vocational training:</p><ul>" +
  [
    "Work as a vocation",
    "Healthy habits and recreation",
    "Recovery &amp; relapse prevention",
    "Emotional intelligence",
    "Financial literacy",
    "Conflict resolution &amp; communication",
    "Vision/goal setting &amp; time management",
  ]
    .map((s) => `<li>${s}</li>`)
    .join("") +
  "</ul>";

const pageLayouts: Array<{ page: string; layout: object[] }> = [
  {
    page: "home",
    layout: [
      {
        id: crypto.randomUUID(),
        type: "hero",
        bg: "cream",
        title: "Growing People. Building Futures.",
        body: "Trellis Workforce Development creates meaningful employment and life-skills training for people in recovery — helping them build stable, purposeful lives.",
        buttons: [
          { label: "Our Programs", href: "/programs", variant: "primary" },
          { label: "Support Us", href: "/donate", variant: "outline" },
        ],
      },
      {
        id: crypto.randomUUID(),
        type: "twocol",
        bg: "white",
        left: {
          heading: "The Problem",
          body: "Those in recovery face incredible challenges in acquiring gainful employment. When they do find jobs, they are often in industries with little skill training and demanding schedules — not conducive to recovery, spiritual growth, or building life skills.",
        },
        right: {
          heading: "Our Solution",
          body: "Trellis operates fee-for-service businesses — auto repair, detailing, contracting and more — where recovering individuals receive paid work, mentorship, and structured life-skills training. Graduates transition into mainstream employment after 12–15 months.",
        },
      },
      {
        id: crypto.randomUUID(),
        type: "stats",
        bg: "olive",
        items: [
          { stat: "12–15", label: "months to graduation" },
          { stat: "3+", label: "enterprises launching" },
          { stat: "100%", label: "faith-driven mission" },
        ],
      },
      {
        id: crypto.randomUUID(),
        type: "cta",
        bg: "white",
        title: "Partner With Us",
        body: "Whether you're a business looking to hire, a donor wanting to invest in community change, or someone in recovery seeking opportunity — we want to hear from you.",
        buttons: [
          { label: "Get in Touch", href: "/contact", variant: "primary" },
        ],
      },
    ],
  },
  {
    page: "about",
    layout: [
      {
        id: crypto.randomUUID(),
        type: "hero",
        bg: "cream",
        title: "Our Mission",
        body: "Trellis Workforce Development was founded by a community of faith to create meaningful, structured employment for people recovering from addiction — while building the life skills they need to thrive long-term.",
        buttons: [],
      },
      {
        id: crypto.randomUUID(),
        type: "twocol",
        bg: "white",
        left: {
          heading: "Why We Exist",
          body: "People in recovery face incredible obstacles to stable employment. The jobs they can find often involve little training and demanding schedules that leave no room for the recovery work, spiritual growth, and skill-building that leads to lasting change. Trellis exists to close that gap.",
        },
        right: { heading: "Life Skills Curriculum", body: lifeskillsHtml },
      },
      {
        id: crypto.randomUUID(),
        type: "richtext",
        bg: "white",
        heading: "How It Works",
        body: "We operate real, revenue-generating businesses — starting with auto repair — where trainees work alongside skilled mentors using an apprenticeship model. Trellis controls hours and environment, keeping workdays to 5–6 hours with dedicated time for training and personal development. Graduates ideally enter mainstream employment after 12–15 months.",
      },
      {
        id: crypto.randomUUID(),
        type: "cta",
        bg: "stone",
        title: "Rooted in Faith",
        body: "Trellis was founded through Christ-Way Church and is guided by the belief that every person has dignity, purpose, and the capacity for transformation. Our approach integrates vocational opportunity with spiritual support and community.",
        buttons: [
          { label: "See Our Programs", href: "/programs", variant: "primary" },
          { label: "Get Involved", href: "/contact", variant: "outline" },
        ],
      },
    ],
  },
  {
    page: "donate",
    layout: [
      {
        id: crypto.randomUUID(),
        type: "hero",
        bg: "cream",
        title: "Invest in Recovery",
        body: "Your gift helps create jobs, restore dignity, and build a path forward for people in recovery. Trellis has filed for 501(c)(3) status — donations are tax-deductible upon approval.",
        buttons: [],
      },
      {
        id: crypto.randomUUID(),
        type: "cta",
        bg: "cream",
        title: "Online Giving Coming Soon",
        body: "We're setting up secure online giving. In the meantime, please reach out to us directly to make a donation or discuss a gift.",
        buttons: [
          { label: "Contact Us to Give", href: "/contact", variant: "primary" },
        ],
      },
      {
        id: crypto.randomUUID(),
        type: "tiers",
        bg: "stone",
        heading: "Startup Funding Goals",
        intro: "Here's how your support maps to impact:",
        items: [
          {
            name: "Baseline",
            amount: "$75,000",
            description:
              "Initial equipment & tools for auto repair, 2 months of wages for program director, trainer, and 2 trainees, and 2 months of operations.",
          },
          {
            name: "Advancing",
            amount: "$100,000",
            description:
              "Everything in Baseline plus additional tools and 6 months of program director support.",
            highlight: true,
          },
          {
            name: "Aspirational",
            amount: "$125,000",
            description:
              "Everything in Advancing plus a full year of program director wages and benefits.",
          },
          {
            name: "Transformational",
            amount: "$250,000",
            description:
              "Everything in Aspirational plus a full-time executive director to grow the organization.",
          },
        ],
      },
      {
        id: crypto.randomUUID(),
        type: "cards",
        bg: "white",
        heading: "Other Ways to Support",
        items: [
          {
            title: "Individual Giving",
            body: "Trellis has filed IRS Form 1023 for 501(c)(3) status. We anticipate approval by February 2026 and can operate as an exempt organization at the time of filing.",
          },
          {
            title: "County & State Grants",
            body: "All US counties have received opioid settlement funding. Trellis is actively pursuing grants from Union, Snyder, and Northumberland counties, plus PA Work Opportunity Tax Credits.",
          },
          {
            title: "Corporate Partnership",
            body: "Companies can partner with Trellis through CSR giving, employee volunteering as trainers, or committing to hire our graduates.",
          },
        ],
      },
    ],
  },
];

let layoutsInserted = 0;
for (const entry of pageLayouts) {
  const existing = db
    .select()
    .from(schema.pageLayout)
    .where(
      and(
        eq(schema.pageLayout.siteId, SITE_ID),
        eq(schema.pageLayout.page, entry.page),
      ),
    )
    .get();
  if (!existing) {
    db.insert(schema.pageLayout)
      .values({
        siteId: SITE_ID,
        page: entry.page,
        layout: JSON.stringify(entry.layout),
      })
      .run();
    layoutsInserted++;
  }
}
if (layoutsInserted > 0) {
  console.log(`✓ ${layoutsInserted} page layouts seeded`);
} else {
  console.log("Page layouts already exist, skipping.");
}

// ─── Client owner profile ─────────────────────────────────────────────────────
const adminUser = db
  .select()
  .from(schema.user)
  .where(eq(schema.user.email, ADMIN_EMAIL))
  .get();

if (adminUser) {
  const existingProfile = db
    .select()
    .from(schema.userProfile)
    .where(eq(schema.userProfile.userId, adminUser.id))
    .get();
  if (!existingProfile) {
    db.insert(schema.userProfile)
      .values({ userId: adminUser.id, role: "editor" })
      .run();
    console.log("✓ Trellis owner profile seeded");
  } else {
    console.log("Admin user profile already exists, skipping.");
  }
} else {
  console.log("Admin user not found, skipping profile seed.");
}

// ─── Default multi-site workspace ────────────────────────────────────────────
const defaultSite = db
  .select()
  .from(schema.cmsSite)
  .where(eq(schema.cmsSite.id, SITE_ID))
  .get();
if (!defaultSite) {
  db.insert(schema.cmsSite)
    .values({
      id: SITE_ID,
      name: "Trellis Workforce Development",
      slug: "trellis",
      locale: "en-US",
      timezone: "America/New_York",
    })
    .run();
  console.log("✓ Trellis client workspace seeded");
}
if (adminUser) {
  db.insert(schema.siteMembership)
    .values({ siteId: SITE_ID, userId: adminUser.id, role: "owner" })
    .onConflictDoNothing()
    .run();
}
db.insert(schema.siteSubscription)
  .values({ siteId: SITE_ID, plan: "free", status: "none" })
  .onConflictDoNothing()
  .run();
db.insert(schema.analyticsSettings)
  .values({ siteId: SITE_ID, enabled: true, retentionDays: 90 })
  .onConflictDoNothing()
  .run();

// ─── Default site settings ────────────────────────────────────────────────────
const existingSettings = db
  .select()
  .from(schema.siteSettings)
  .where(eq(schema.siteSettings.siteId, SITE_ID))
  .get();
if (!existingSettings) {
  db.insert(schema.siteSettings)
    .values({
      siteId: SITE_ID,
      siteName: "Trellis Workforce Development",
      logoUrl: "/clients/trellis/logo.svg",
      iconUrl: "/clients/trellis/icon.svg",
      themePreset: "foundation",
      primaryColor: "#8a7d55",
      accentColor: "#f8f5ee",
      bodyFont: "Source Sans 3",
      headingFont: "Georgia",
      onboardingComplete: true,
      navLinks: JSON.stringify([
        { label: "About", href: "/about" },
        { label: "Team", href: "/team" },
        { label: "Programs", href: "/programs" },
        { label: "Contact", href: "/contact" },
      ]),
      footerTagline:
        "Workforce Development — creating meaningful employment for those in recovery.",
      contactEmail: "trellis.wd@gmail.com",
      address: "Sunbury, PA",
      socialLinks: "[]",
      seoTitle: "Trellis Workforce Development",
      seoDescription:
        "Creating meaningful employment for those in recovery — building life skills and leadership.",
    })
    .run();
  console.log("✓ Trellis site settings seeded");
} else {
  console.log("Site settings already exist, skipping.");
}

console.log(`
✅ Seed complete!

Admin login:
  Email:    ${ADMIN_EMAIL}
  Password: ${ADMIN_PASSWORD}

⚠️  Change the admin password after first login!
`);

sqlite.close();
