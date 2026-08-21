import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTableCreator,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const createTable = sqliteTableCreator((name) => `trellis_${name}`);

// ─── BetterAuth required tables ───────────────────────────────────────────────

export const user = createTable("user", (d) => ({
  id: d.text().primaryKey(),
  name: d.text().notNull(),
  email: d.text().notNull().unique(),
  emailVerified: d.integer({ mode: "boolean" }).notNull().default(false),
  twoFactorEnabled: d.integer({ mode: "boolean" }).notNull().default(false),
  image: d.text(),
  createdAt: d
    .integer({ mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: d
    .integer({ mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}));

export const session = createTable("session", (d) => ({
  id: d.text().primaryKey(),
  expiresAt: d.integer({ mode: "timestamp" }).notNull(),
  token: d.text().notNull().unique(),
  createdAt: d
    .integer({ mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: d
    .integer({ mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  ipAddress: d.text(),
  userAgent: d.text(),
  userId: d
    .text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
}));

export const account = createTable(
  "account",
  (d) => ({
    id: d.text().primaryKey(),
    issuer: d.text().notNull().default("local:credential"),
    accountId: d.text().notNull(),
    providerId: d.text().notNull(),
    userId: d
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: d.text(),
    refreshToken: d.text(),
    idToken: d.text(),
    accessTokenExpiresAt: d.integer({ mode: "timestamp" }),
    refreshTokenExpiresAt: d.integer({ mode: "timestamp" }),
    scope: d.text(),
    password: d.text(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  }),
  (t) => [uniqueIndex("account_issuer_account_idx").on(t.issuer, t.accountId)],
);

export const verification = createTable("verification", (d) => ({
  id: d.text().primaryKey(),
  identifier: d.text().notNull(),
  value: d.text().notNull(),
  expiresAt: d.integer({ mode: "timestamp" }).notNull(),
  createdAt: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
}));

export const twoFactor = createTable(
  "two_factor",
  (d) => ({
    id: d.text().primaryKey(),
    secret: d.text().notNull(),
    backupCodes: d.text().notNull(),
    userId: d
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  }),
  (t) => [
    index("two_factor_secret_idx").on(t.secret),
    index("two_factor_user_idx").on(t.userId),
  ],
);

// ─── CMS: Team Members ────────────────────────────────────────────────────────

export const teamMembers = createTable(
  "team_member",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    name: d.text({ length: 256 }).notNull(),
    role: d.text({ length: 256 }).notNull(),
    bio: d.text(),
    imageUrl: d.text(),
    order: d.integer({ mode: "number" }).notNull().default(0),
    isAffiliate: d.integer({ mode: "boolean" }).notNull().default(false),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("team_order_idx").on(t.siteId, t.order)],
);

// ─── CMS: Companies / Programs ────────────────────────────────────────────────

export const companies = createTable(
  "company",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    name: d.text({ length: 256 }).notNull(),
    slug: d.text({ length: 256 }).notNull(),
    tagline: d.text({ length: 512 }),
    description: d.text(),
    imageUrl: d.text(),
    seoTitle: d.text({ length: 512 }),
    seoDescription: d.text({ length: 1000 }),
    ogImage: d.text(),
    canonical: d.text(),
    noIndex: d.integer({ mode: "boolean" }).notNull().default(false),
    status: d
      .text({ enum: ["active", "coming_soon", "archived"] })
      .notNull()
      .default("active"),
    order: d.integer({ mode: "number" }).notNull().default(0),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    uniqueIndex("company_slug_idx").on(t.siteId, t.slug),
    index("company_order_idx").on(t.siteId, t.order),
  ],
);

// ─── CMS: Page Content (key/value blocks for editable sections) ───────────────

export const pageContent = createTable(
  "page_content",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    page: d.text({ length: 128 }).notNull(), // e.g. "home", "about", "donate"
    key: d.text({ length: 128 }).notNull(), // e.g. "hero_title", "hero_body"
    value: d.text().notNull(),
    draftValue: d.text(), // null = no pending draft; set by admin, cleared on publish
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("page_content_idx").on(t.siteId, t.page, t.key)],
);

// ─── Block-based page layouts ─────────────────────────────────────────────────

export const pageLayout = createTable(
  "page_layout",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    page: d.text({ length: 128 }).notNull(),
    layout: d.text().notNull().default("[]"), // JSON: Block[]
    draftLayout: d.text(), // JSON: Block[] | null
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [uniqueIndex("page_layout_site_page_idx").on(t.siteId, t.page)],
);

// ─── Page SEO metadata ───────────────────────────────────────────────────────

export const pageSeo = createTable(
  "page_seo",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    page: d.text({ length: 128 }).notNull(),
    title: d.text({ length: 512 }),
    description: d.text({ length: 1000 }),
    ogImage: d.text(),
    canonical: d.text(),
    noIndex: d.integer({ mode: "boolean" }).notNull().default(false),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [uniqueIndex("page_seo_site_page_idx").on(t.siteId, t.page)],
);

// ─── User profiles & roles ────────────────────────────────────────────────────

export const userProfile = createTable("user_profile", (d) => ({
  userId: d
    .text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  role: d
    .text({ enum: ["admin", "editor", "viewer"] })
    .notNull()
    .default("viewer"),
  displayName: d.text({ length: 256 }),
  bio: d.text({ length: 1000 }),
  avatarUrl: d.text(),
  timezone: d.text({ length: 80 }).notNull().default("America/New_York"),
  locale: d.text({ length: 32 }).notNull().default("en-US"),
  emailNotifications: d.integer({ mode: "boolean" }).notNull().default(true),
}));

// ─── Site settings (white-label) ─────────────────────────────────────────────

export const siteSettings = createTable(
  "site_settings",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    siteName: d.text().notNull().default("Trellis Workforce Development"),
    siteUrl: d.text(),
    logoUrl: d.text(),
    iconUrl: d.text(),
    themePreset: d
      .text({
        enum: [
          "trellis",
          "editorial",
          "studio",
          "heritage",
          "sunrise",
          "noir",
          "signal",
        ],
      })
      .notNull()
      .default("trellis"),
    cornerStyle: d
      .text({ enum: ["square", "subtle", "rounded", "playful"] })
      .notNull()
      .default("rounded"),
    contentAlignment: d
      .text({ enum: ["left", "center", "right"] })
      .notNull()
      .default("left"),
    layoutPreset: d
      .text({
        enum: ["classic", "editorial", "photography", "technical", "projects"],
      })
      .notNull()
      .default("classic"),
    headerStyle: d
      .text({ enum: ["standard", "centered", "minimal"] })
      .notNull()
      .default("standard"),
    footerStyle: d
      .text({ enum: ["columns", "centered", "minimal"] })
      .notNull()
      .default("columns"),
    sectionSpacing: d
      .text({ enum: ["compact", "balanced", "airy"] })
      .notNull()
      .default("balanced"),
    buttonStyle: d
      .text({ enum: ["square", "rounded", "pill"] })
      .notNull()
      .default("rounded"),
    onboardingComplete: d.integer({ mode: "boolean" }).notNull().default(false),
    primaryColor: d.text().notNull().default("#8a7d55"),
    accentColor: d.text().notNull().default("#f8f5ee"),
    textColor: d.text().notNull().default("#2c2826"),
    bodyFont: d.text().notNull().default("Source Sans 3"),
    headingFont: d.text().notNull().default("Georgia"),
    navLinks: d.text().notNull().default("[]"), // JSON: [{label,href}]
    footerTagline: d.text(),
    contactEmail: d.text(),
    contactPhone: d.text(),
    address: d.text(),
    socialLinks: d.text().notNull().default("[]"), // JSON: [{platform,url}]
    seoTitle: d.text(),
    seoDescription: d.text(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [uniqueIndex("site_settings_site_idx").on(t.siteId)],
);

// ─── Contact form submissions ─────────────────────────────────────────────────

export const contactSubmissions = createTable("contact_submission", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  siteId: d.text().notNull().default("default"),
  name: d.text({ length: 256 }).notNull(),
  email: d.text({ length: 256 }).notNull(),
  subject: d.text({ length: 512 }),
  message: d.text().notNull(),
  read: d.integer({ mode: "boolean" }).notNull().default(false),
  createdAt: d
    .integer({ mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}));

export const contactThrottle = createTable("contact_throttle", (d) => ({
  key: d.text({ length: 128 }).primaryKey(),
  siteId: d.text().notNull().default("default"),
  count: d.integer({ mode: "number" }).notNull().default(0),
  windowStart: d.integer({ mode: "timestamp" }).notNull(),
}));

// ─── Media library ───────────────────────────────────────────────────────────

export const mediaAsset = createTable(
  "media_asset",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    url: d.text().notNull().unique(),
    filename: d.text({ length: 512 }).notNull(),
    mimeType: d.text({ length: 128 }).notNull(),
    size: d.integer({ mode: "number" }).notNull(),
    storageKey: d.text(),
    width: d.integer({ mode: "number" }),
    height: d.integer({ mode: "number" }),
    alt: d.text({ length: 1000 }).notNull().default(""),
    title: d.text({ length: 512 }),
    caption: d.text({ length: 2000 }),
    folder: d.text({ length: 256 }).notNull().default(""),
    focalX: d.integer({ mode: "number" }).notNull().default(50),
    focalY: d.integer({ mode: "number" }).notNull().default(50),
    checksum: d.text({ length: 64 }),
    dominantColor: d.text({ length: 7 }),
    blurDataUrl: d.text(),
    status: d
      .text({ enum: ["processing", "ready", "failed"] })
      .notNull()
      .default("ready"),
    uploadedBy: d.text().references(() => user.id, { onDelete: "set null" }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [uniqueIndex("media_asset_checksum_idx").on(t.siteId, t.checksum)],
);

export const mediaVariant = createTable(
  "media_variant",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    assetId: d
      .integer({ mode: "number" })
      .notNull()
      .references(() => mediaAsset.id, { onDelete: "cascade" }),
    kind: d
      .text({
        enum: ["thumbnail", "small", "medium", "large", "avif", "original"],
      })
      .notNull(),
    url: d.text().notNull().unique(),
    storageKey: d.text().notNull(),
    mimeType: d.text({ length: 128 }).notNull(),
    size: d.integer({ mode: "number" }).notNull(),
    width: d.integer({ mode: "number" }),
    height: d.integer({ mode: "number" }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  }),
  (t) => [
    uniqueIndex("media_variant_asset_kind_idx").on(t.assetId, t.kind),
    index("media_variant_site_idx").on(t.siteId, t.assetId),
  ],
);

// ─── Published revision history ──────────────────────────────────────────────

export const contentRevision = createTable(
  "content_revision",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    entityType: d.text({ enum: ["page", "company", "post"] }).notNull(),
    entityId: d.text({ length: 256 }).notNull(),
    snapshot: d.text().notNull(),
    createdBy: d.text().references(() => user.id, { onDelete: "set null" }),
    createdEmail: d.text({ length: 256 }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  }),
  (t) => [
    index("content_revision_entity_idx").on(
      t.entityType,
      t.entityId,
      t.createdAt,
    ),
  ],
);

// ─── Redirects created when public slugs change ──────────────────────────────

export const redirects = createTable(
  "redirect",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    fromPath: d.text({ length: 512 }).notNull(),
    toPath: d.text({ length: 512 }).notNull(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  }),
  (t) => [uniqueIndex("redirect_site_path_idx").on(t.siteId, t.fromPath)],
);

// ─── Calendar events ─────────────────────────────────────────────────────────

export const calendarEvent = createTable(
  "calendar_event",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    title: d.text({ length: 512 }).notNull(),
    description: d.text(),
    location: d.text({ length: 1000 }),
    url: d.text(),
    startAt: d.integer({ mode: "timestamp" }).notNull(),
    endAt: d.integer({ mode: "timestamp" }).notNull(),
    allDay: d.integer({ mode: "boolean" }).notNull().default(false),
    status: d
      .text({ enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("calendar_event_start_idx").on(t.startAt),
    index("calendar_event_status_idx").on(t.status),
  ],
);

// ─── Audit log ────────────────────────────────────────────────────────────────

export const auditLog = createTable(
  "audit_log",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    userId: d.text().references(() => user.id, { onDelete: "set null" }),
    userEmail: d.text({ length: 256 }), // denormalized for display after user deletion
    action: d.text({ length: 128 }).notNull(), // e.g. "content.save", "team.delete"
    entity: d.text({ length: 128 }), // e.g. "page:home", "team:5"
    detail: d.text(), // optional human-readable summary
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  }),
  (t) => [index("audit_log_created_idx").on(t.createdAt)],
);

// ─── Company sub-page layouts ─────────────────────────────────────────────────

export const companyPage = createTable("company_page", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  siteId: d.text().notNull().default("default"),
  companyId: d
    .integer({ mode: "number" })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  layout: d.text().notNull().default("[]"), // JSON: Block[]
  draftLayout: d.text(), // JSON: Block[] | null
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

// ─── Blog posts ────────────────────────────────────────────────────────────────

export const post = createTable(
  "post",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    title: d.text({ length: 512 }).notNull(),
    slug: d.text({ length: 256 }).notNull(),
    excerpt: d.text(),
    coverImage: d.text(),
    layout: d.text().notNull().default("[]"), // JSON: Block[]
    draftLayout: d.text(), // JSON: Block[] | null
    status: d
      .text({ enum: ["draft", "scheduled", "published"] })
      .notNull()
      .default("draft"),
    publishedAt: d.integer({ mode: "timestamp" }),
    scheduledAt: d.integer({ mode: "timestamp" }),
    category: d.text({ length: 128 }),
    kind: d
      .text({ enum: ["news", "article"] })
      .notNull()
      .default("article"),
    byline: d.text({ length: 256 }),
    sourceUrl: d.text(),
    seoTitle: d.text({ length: 512 }),
    seoDescription: d.text({ length: 1000 }),
    ogImage: d.text(),
    canonical: d.text(),
    noIndex: d.integer({ mode: "boolean" }).notNull().default(false),
    authorId: d.text().references(() => user.id, { onDelete: "set null" }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    uniqueIndex("post_slug_idx").on(t.siteId, t.slug),
    index("post_status_idx").on(t.siteId, t.status),
    index("post_published_idx").on(t.siteId, t.publishedAt),
  ],
);

// ─── hadlockCMS platform: sites and memberships ─────────────────────────────

export const cmsSite = createTable("cms_site", (d) => ({
  id: d.text().primaryKey(),
  name: d.text({ length: 256 }).notNull(),
  slug: d.text({ length: 128 }).notNull().unique(),
  hostname: d.text({ length: 256 }).unique(),
  domainStatus: d
    .text({ enum: ["unconfigured", "pending", "verified", "failed"] })
    .notNull()
    .default("unconfigured"),
  domainVerificationToken: d.text({ length: 128 }),
  domainVerifiedAt: d.integer({ mode: "timestamp" }),
  mcpTokenHash: d.text({ length: 128 }),
  locale: d.text({ length: 32 }).notNull().default("en-US"),
  timezone: d.text({ length: 80 }).notNull().default("America/New_York"),
  storageQuotaBytes: d
    .integer({ mode: "number" })
    .notNull()
    .default(1_073_741_824),
  status: d
    .text({ enum: ["active", "archived"] })
    .notNull()
    .default("active"),
  createdAt: d
    .integer({ mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const siteSubscription = createTable(
  "site_subscription",
  (d) => ({
    siteId: d
      .text()
      .primaryKey()
      .references(() => cmsSite.id, { onDelete: "cascade" }),
    plan: d
      .text({ enum: ["free", "starter", "professional", "business"] })
      .notNull()
      .default("free"),
    status: d
      .text({
        enum: [
          "none",
          "incomplete",
          "incomplete_expired",
          "trialing",
          "active",
          "past_due",
          "canceled",
          "unpaid",
          "paused",
        ],
      })
      .notNull()
      .default("none"),
    stripeCustomerId: d.text({ length: 128 }).unique(),
    stripeSubscriptionId: d.text({ length: 128 }).unique(),
    stripePriceId: d.text({ length: 128 }),
    currentPeriodEnd: d.integer({ mode: "timestamp" }),
    lastStripeEventAt: d.integer({ mode: "timestamp" }),
    cancelAtPeriodEnd: d.integer({ mode: "boolean" }).notNull().default(false),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("site_subscription_status_idx").on(t.status)],
);

export const stripeWebhookEvent = createTable("stripe_webhook_event", (d) => ({
  id: d.text({ length: 128 }).primaryKey(),
  type: d.text({ length: 128 }).notNull(),
  processedAt: d
    .integer({ mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}));

export const analyticsSettings = createTable("analytics_settings", (d) => ({
  siteId: d
    .text()
    .primaryKey()
    .references(() => cmsSite.id, { onDelete: "cascade" }),
  enabled: d.integer({ mode: "boolean" }).notNull().default(true),
  retentionDays: d.integer({ mode: "number" }).notNull().default(90),
  lastPrunedAt: d.integer({ mode: "timestamp" }),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const analyticsEvent = createTable(
  "analytics_event",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d
      .text()
      .notNull()
      .references(() => cmsSite.id, { onDelete: "cascade" }),
    kind: d
      .text({ enum: ["pageview", "conversion", "outbound_click"] })
      .notNull(),
    name: d.text({ length: 128 }),
    path: d.text({ length: 2048 }).notNull(),
    referrer: d.text({ length: 512 }),
    visitorHash: d.text({ length: 64 }),
    device: d
      .text({ enum: ["desktop", "tablet", "mobile", "unknown"] })
      .notNull()
      .default("unknown"),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  }),
  (t) => [
    index("analytics_event_site_created_idx").on(t.siteId, t.createdAt),
    index("analytics_event_site_path_idx").on(t.siteId, t.path),
    index("analytics_event_visitor_idx").on(t.siteId, t.visitorHash),
  ],
);

export const siteTemplate = createTable(
  "site_template",
  (d) => ({
    id: d.text().primaryKey(),
    siteId: d
      .text()
      .notNull()
      .references(() => cmsSite.id, { onDelete: "cascade" }),
    name: d.text({ length: 256 }).notNull(),
    description: d.text({ length: 1000 }),
    category: d.text({ length: 128 }).notNull().default("custom"),
    thumbnailUrl: d.text(),
    snapshot: d.text().notNull(),
    createdBy: d.text().references(() => user.id, { onDelete: "set null" }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [uniqueIndex("site_template_name_idx").on(t.siteId, t.name)],
);

export const sitePublication = createTable(
  "site_publication",
  (d) => ({
    id: d.text().primaryKey(),
    siteId: d
      .text()
      .notNull()
      .references(() => cmsSite.id, { onDelete: "cascade" }),
    status: d
      .text({ enum: ["succeeded", "failed"] })
      .notNull()
      .default("succeeded"),
    summary: d.text().notNull().default("{}"),
    error: d.text(),
    createdBy: d.text().references(() => user.id, { onDelete: "set null" }),
    createdEmail: d.text({ length: 256 }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  }),
  (t) => [index("site_publication_site_idx").on(t.siteId, t.createdAt)],
);

export const siteMembership = createTable(
  "site_membership",
  (d) => ({
    siteId: d
      .text()
      .notNull()
      .references(() => cmsSite.id, { onDelete: "cascade" }),
    userId: d
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: d
      .text({ enum: ["owner", "admin", "editor", "reviewer", "viewer"] })
      .notNull()
      .default("viewer"),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  }),
  (t) => [uniqueIndex("site_membership_unique_idx").on(t.siteId, t.userId)],
);

// ─── Secure user invitations ────────────────────────────────────────────────

export const userInvitation = createTable(
  "user_invitation",
  (d) => ({
    id: d.text().primaryKey(),
    siteId: d.text().notNull().default("default"),
    email: d.text({ length: 256 }).notNull(),
    name: d.text({ length: 256 }).notNull(),
    role: d.text({ enum: ["admin", "editor", "reviewer", "viewer"] }).notNull(),
    tokenHash: d.text({ length: 128 }).notNull().unique(),
    invitedBy: d.text().references(() => user.id, { onDelete: "set null" }),
    expiresAt: d.integer({ mode: "timestamp" }).notNull(),
    acceptedAt: d.integer({ mode: "timestamp" }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  }),
  (t) => [index("user_invitation_email_idx").on(t.email)],
);

// ─── Dynamic pages and localized variants ──────────────────────────────────

export const dynamicPage = createTable(
  "dynamic_page",
  (d) => ({
    id: d.text().primaryKey(),
    siteId: d.text().notNull().default("default"),
    parentId: d.text(),
    title: d.text({ length: 512 }).notNull(),
    slug: d.text({ length: 512 }).notNull(),
    locale: d.text({ length: 32 }).notNull().default("en-US"),
    status: d
      .text({
        enum: [
          "draft",
          "in_review",
          "approved",
          "scheduled",
          "published",
          "archived",
        ],
      })
      .notNull()
      .default("draft"),
    layout: d.text().notNull().default("[]"),
    draftLayout: d.text(),
    seoTitle: d.text({ length: 512 }),
    seoDescription: d.text({ length: 1000 }),
    ogImage: d.text(),
    canonical: d.text(),
    noIndex: d.integer({ mode: "boolean" }).notNull().default(false),
    publishAt: d.integer({ mode: "timestamp" }),
    unpublishAt: d.integer({ mode: "timestamp" }),
    createdBy: d.text().references(() => user.id, { onDelete: "set null" }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    uniqueIndex("dynamic_page_path_locale_idx").on(t.siteId, t.slug, t.locale),
    index("dynamic_page_parent_idx").on(t.siteId, t.parentId),
    index("dynamic_page_status_idx").on(t.siteId, t.status),
  ],
);

// ─── Editorial workflow, assignments, comments, and locks ──────────────────

export const editorialWorkflow = createTable(
  "editorial_workflow",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    entityType: d
      .text({
        enum: [
          "page",
          "dynamic_page",
          "company",
          "post",
          "event",
          "reusable_block",
        ],
      })
      .notNull(),
    entityId: d.text({ length: 256 }).notNull(),
    state: d
      .text({
        enum: [
          "draft",
          "in_review",
          "changes_requested",
          "approved",
          "scheduled",
          "published",
          "archived",
        ],
      })
      .notNull()
      .default("draft"),
    assignedTo: d.text().references(() => user.id, { onDelete: "set null" }),
    lockedBy: d.text().references(() => user.id, { onDelete: "set null" }),
    lockedAt: d.integer({ mode: "timestamp" }),
    publishAt: d.integer({ mode: "timestamp" }),
    unpublishAt: d.integer({ mode: "timestamp" }),
    updatedBy: d.text().references(() => user.id, { onDelete: "set null" }),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    uniqueIndex("editorial_workflow_entity_idx").on(
      t.siteId,
      t.entityType,
      t.entityId,
    ),
  ],
);

export const editorialComment = createTable(
  "editorial_comment",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    entityType: d.text({ length: 64 }).notNull(),
    entityId: d.text({ length: 256 }).notNull(),
    body: d.text().notNull(),
    authorId: d.text().references(() => user.id, { onDelete: "set null" }),
    resolvedAt: d.integer({ mode: "timestamp" }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  }),
  (t) => [
    index("editorial_comment_entity_idx").on(
      t.entityType,
      t.entityId,
      t.createdAt,
    ),
  ],
);

// ─── Reusable blocks and taxonomies ─────────────────────────────────────────

export const reusableBlock = createTable(
  "reusable_block",
  (d) => ({
    id: d.text().primaryKey(),
    siteId: d.text().notNull().default("default"),
    name: d.text({ length: 256 }).notNull(),
    category: d.text({ length: 128 }),
    content: d.text().notNull().default("[]"),
    draftContent: d.text(),
    createdBy: d.text().references(() => user.id, { onDelete: "set null" }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [uniqueIndex("reusable_block_name_idx").on(t.siteId, t.name)],
);

export const taxonomyTerm = createTable(
  "taxonomy_term",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    type: d.text({ enum: ["category", "tag"] }).notNull(),
    name: d.text({ length: 256 }).notNull(),
    slug: d.text({ length: 256 }).notNull(),
    parentId: d.integer({ mode: "number" }),
  }),
  (t) => [uniqueIndex("taxonomy_term_slug_idx").on(t.siteId, t.type, t.slug)],
);

export const postTerm = createTable(
  "post_term",
  (d) => ({
    postId: d
      .integer({ mode: "number" })
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    termId: d
      .integer({ mode: "number" })
      .notNull()
      .references(() => taxonomyTerm.id, { onDelete: "cascade" }),
  }),
  (t) => [uniqueIndex("post_term_unique_idx").on(t.postId, t.termId)],
);

// ─── Custom forms and submissions ───────────────────────────────────────────

export const customForm = createTable(
  "custom_form",
  (d) => ({
    id: d.text().primaryKey(),
    siteId: d.text().notNull().default("default"),
    name: d.text({ length: 256 }).notNull(),
    slug: d.text({ length: 256 }).notNull(),
    fields: d.text().notNull().default("[]"),
    submitLabel: d.text({ length: 128 }).notNull().default("Submit"),
    successMessage: d
      .text()
      .notNull()
      .default("Thank you. Your response has been received."),
    notificationEmail: d.text({ length: 256 }),
    active: d.integer({ mode: "boolean" }).notNull().default(true),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [uniqueIndex("custom_form_slug_idx").on(t.siteId, t.slug)],
);

export const customFormSubmission = createTable(
  "custom_form_submission",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    formId: d
      .text()
      .notNull()
      .references(() => customForm.id, { onDelete: "cascade" }),
    data: d.text().notNull(),
    status: d
      .text({ enum: ["new", "in_progress", "resolved", "spam"] })
      .notNull()
      .default("new"),
    assignedTo: d.text().references(() => user.id, { onDelete: "set null" }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  }),
  (t) => [
    index("custom_form_submission_idx").on(t.formId, t.status, t.createdAt),
  ],
);

// ─── Integrations and operational telemetry ─────────────────────────────────

export const webhookEndpoint = createTable("webhook_endpoint", (d) => ({
  id: d.text().primaryKey(),
  siteId: d.text().notNull().default("default"),
  name: d.text({ length: 256 }).notNull(),
  url: d.text().notNull(),
  secret: d.text().notNull(),
  events: d.text().notNull().default("[]"),
  active: d.integer({ mode: "boolean" }).notNull().default(true),
  createdAt: d
    .integer({ mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const webhookDelivery = createTable(
  "webhook_delivery",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    endpointId: d
      .text()
      .references(() => webhookEndpoint.id, { onDelete: "set null" }),
    event: d.text({ length: 128 }).notNull(),
    responseCode: d.integer({ mode: "number" }),
    success: d.integer({ mode: "boolean" }).notNull().default(false),
    error: d.text(),
    attemptedAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  }),
  (t) => [index("webhook_delivery_attempt_idx").on(t.attemptedAt)],
);

export const operationEvent = createTable(
  "operation_event",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    siteId: d.text().notNull().default("default"),
    level: d
      .text({ enum: ["info", "warning", "error"] })
      .notNull()
      .default("info"),
    source: d.text({ length: 128 }).notNull(),
    message: d.text().notNull(),
    detail: d.text(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  }),
  (t) => [index("operation_event_created_idx").on(t.createdAt)],
);
