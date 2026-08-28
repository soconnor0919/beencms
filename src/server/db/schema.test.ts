import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  auditLog,
  analyticsEvent,
  analyticsSettings,
  calendarEvent,
  companies,
  companyPage,
  contactSubmissions,
  contentRevision,
  customForm,
  dynamicPage,
  editorialComment,
  editorialWorkflow,
  mediaAsset,
  mediaVariant,
  operationEvent,
  pageContent,
  pageLayout,
  pageSeo,
  post,
  redirects,
  reusableBlock,
  siteSettings,
  sitePublication,
  siteSubscription,
  siteTemplate,
  taxonomyTerm,
  teamMembers,
  userInvitation,
  webhookEndpoint,
} from "~/server/db/schema";

const siteOwnedTables = [
  auditLog,
  analyticsEvent,
  analyticsSettings,
  calendarEvent,
  companies,
  companyPage,
  contactSubmissions,
  contentRevision,
  customForm,
  dynamicPage,
  editorialComment,
  editorialWorkflow,
  mediaAsset,
  mediaVariant,
  operationEvent,
  pageContent,
  pageLayout,
  pageSeo,
  post,
  redirects,
  reusableBlock,
  siteSettings,
  sitePublication,
  siteSubscription,
  siteTemplate,
  taxonomyTerm,
  teamMembers,
  userInvitation,
  webhookEndpoint,
];

describe("multi-site schema boundaries", () => {
  it("uses a platform namespace instead of a client namespace", () => {
    for (const table of siteOwnedTables)
      expect(getTableName(table)).toMatch(/^hadlock_/);
  });

  it("requires every site-owned root record to carry a site id", () => {
    for (const table of siteOwnedTables)
      expect(getTableColumns(table)).toHaveProperty("siteId");
  });
});
