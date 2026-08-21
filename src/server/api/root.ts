import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { teamRouter } from "~/server/api/routers/team";
import { companiesRouter } from "~/server/api/routers/companies";
import { contentRouter } from "~/server/api/routers/content";
import { contactRouter } from "~/server/api/routers/contact";
import { layoutRouter } from "~/server/api/routers/layout";
import { usersRouter } from "~/server/api/routers/users";
import { settingsRouter } from "~/server/api/routers/settings";
import { auditRouter } from "~/server/api/routers/audit";
import { companyPageRouter } from "~/server/api/routers/companyPage";
import { postsRouter } from "~/server/api/routers/posts";
import { mediaRouter } from "~/server/api/routers/media";
import { seoRouter } from "~/server/api/routers/seo";
import { revisionsRouter } from "~/server/api/routers/revisions";
import { redirectsRouter } from "~/server/api/routers/redirects";
import { calendarRouter } from "~/server/api/routers/calendar";
import { pagesRouter } from "~/server/api/routers/pages";
import { workflowRouter } from "~/server/api/routers/workflow";
import { libraryRouter } from "~/server/api/routers/library";
import { formsRouter } from "~/server/api/routers/forms";
import { platformRouter } from "~/server/api/routers/platform";
import { profileRouter } from "~/server/api/routers/profile";
import { templatesRouter } from "~/server/api/routers/templates";
import { publishingRouter } from "~/server/api/routers/publishing";
import { billingRouter } from "~/server/api/routers/billing";
import { analyticsRouter } from "~/server/api/routers/analytics";

export const appRouter = createTRPCRouter({
  team: teamRouter,
  companies: companiesRouter,
  content: contentRouter,
  contact: contactRouter,
  layout: layoutRouter,
  users: usersRouter,
  settings: settingsRouter,
  audit: auditRouter,
  companyPage: companyPageRouter,
  posts: postsRouter,
  media: mediaRouter,
  seo: seoRouter,
  revisions: revisionsRouter,
  redirects: redirectsRouter,
  calendar: calendarRouter,
  pages: pagesRouter,
  workflow: workflowRouter,
  library: libraryRouter,
  forms: formsRouter,
  platform: platformRouter,
  profile: profileRouter,
  templates: templatesRouter,
  publishing: publishingRouter,
  billing: billingRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
