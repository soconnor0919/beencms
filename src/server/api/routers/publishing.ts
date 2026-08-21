import { and, desc, eq, isNotNull } from "drizzle-orm";
import {
  publishAllSiteDrafts,
  type PublicationSummary,
} from "~/lib/publishing";
import { createTRPCRouter, editorProcedure } from "~/server/api/trpc";
import {
  companyPage,
  companies,
  dynamicPage,
  pageContent,
  pageLayout,
  post,
  sitePublication,
} from "~/server/db/schema";

export const publishingRouter = createTRPCRouter({
  overview: editorProcedure.query(async ({ ctx }) => {
    const [layouts, pages, posts, companyPages, contentFields, history] =
      await Promise.all([
        ctx.db
          .select({ id: pageLayout.id, title: pageLayout.page })
          .from(pageLayout)
          .where(
            and(
              eq(pageLayout.siteId, ctx.siteId),
              isNotNull(pageLayout.draftLayout),
            ),
          ),
        ctx.db
          .select({ id: dynamicPage.id, title: dynamicPage.title })
          .from(dynamicPage)
          .where(
            and(
              eq(dynamicPage.siteId, ctx.siteId),
              isNotNull(dynamicPage.draftLayout),
            ),
          ),
        ctx.db
          .select({ id: post.id, title: post.title })
          .from(post)
          .where(and(eq(post.siteId, ctx.siteId), isNotNull(post.draftLayout))),
        ctx.db
          .select({ id: companyPage.id, title: companies.name })
          .from(companyPage)
          .innerJoin(companies, eq(companyPage.companyId, companies.id))
          .where(
            and(
              eq(companyPage.siteId, ctx.siteId),
              isNotNull(companyPage.draftLayout),
            ),
          ),
        ctx.db
          .select({ id: pageContent.id, title: pageContent.page })
          .from(pageContent)
          .where(
            and(
              eq(pageContent.siteId, ctx.siteId),
              isNotNull(pageContent.draftValue),
            ),
          ),
        ctx.db
          .select()
          .from(sitePublication)
          .where(eq(sitePublication.siteId, ctx.siteId))
          .orderBy(desc(sitePublication.createdAt))
          .limit(20),
      ]);
    return {
      drafts: [
        ...layouts.map((item) => ({
          type: "site page" as const,
          id: String(item.id),
          title: item.title,
        })),
        ...pages.map((item) => ({
          type: "page" as const,
          id: item.id,
          title: item.title,
        })),
        ...posts.map((item) => ({
          type: "post" as const,
          id: String(item.id),
          title: item.title,
        })),
        ...companyPages.map((item) => ({
          type: "program page" as const,
          id: String(item.id),
          title: item.title,
        })),
        ...Array.from(new Set(contentFields.map((item) => item.title))).map(
          (title) => ({ type: "content fields" as const, id: title, title }),
        ),
      ],
      history: history.map((item) => ({
        ...item,
        summary: JSON.parse(item.summary) as PublicationSummary,
      })),
    };
  }),
  publishAll: editorProcedure.mutation(({ ctx }) =>
    publishAllSiteDrafts({
      siteId: ctx.siteId,
      actorId: ctx.session.user.id,
      actorEmail: ctx.session.user.email,
    }),
  ),
});
