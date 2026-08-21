import { randomUUID } from "crypto";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "~/server/db";
import {
  auditLog,
  companyPage,
  contentRevision,
  dynamicPage,
  pageContent,
  pageLayout,
  post,
  sitePublication,
} from "~/server/db/schema";
import { emitWebhook } from "~/lib/webhooks";

export type PublicationSummary = {
  layouts: number;
  pages: number;
  posts: number;
  companyPages: number;
  contentFields: number;
};

export async function publishAllSiteDrafts({
  siteId,
  actorId,
  actorEmail,
}: {
  siteId: string;
  actorId: string | null;
  actorEmail: string;
}) {
  const publicationId = randomUUID();
  try {
    const summary = db.transaction((tx) => {
      const layouts = tx
        .select()
        .from(pageLayout)
        .where(
          and(eq(pageLayout.siteId, siteId), isNotNull(pageLayout.draftLayout)),
        )
        .all();
      const pages = tx
        .select()
        .from(dynamicPage)
        .where(
          and(
            eq(dynamicPage.siteId, siteId),
            isNotNull(dynamicPage.draftLayout),
          ),
        )
        .all();
      const posts = tx
        .select()
        .from(post)
        .where(and(eq(post.siteId, siteId), isNotNull(post.draftLayout)))
        .all();
      const companyPages = tx
        .select()
        .from(companyPage)
        .where(
          and(
            eq(companyPage.siteId, siteId),
            isNotNull(companyPage.draftLayout),
          ),
        )
        .all();
      const fields = tx
        .select({ id: pageContent.id })
        .from(pageContent)
        .where(
          and(
            eq(pageContent.siteId, siteId),
            isNotNull(pageContent.draftValue),
          ),
        )
        .all();
      const revisions: (typeof contentRevision.$inferInsert)[] = [];
      for (const item of layouts) {
        revisions.push({
          siteId,
          entityType: "page",
          entityId: item.page,
          snapshot: JSON.stringify({ layout: item.draftLayout }),
          createdBy: actorId,
          createdEmail: actorEmail,
        });
        tx.update(pageLayout)
          .set({ layout: item.draftLayout!, draftLayout: null })
          .where(and(eq(pageLayout.siteId, siteId), eq(pageLayout.id, item.id)))
          .run();
      }
      for (const item of pages) {
        revisions.push({
          siteId,
          entityType: "page",
          entityId: `dynamic:${item.id}`,
          snapshot: JSON.stringify({ layout: item.draftLayout }),
          createdBy: actorId,
          createdEmail: actorEmail,
        });
        tx.update(dynamicPage)
          .set({
            layout: item.draftLayout!,
            draftLayout: null,
            status: "published",
            publishAt: new Date(),
          })
          .where(
            and(eq(dynamicPage.siteId, siteId), eq(dynamicPage.id, item.id)),
          )
          .run();
      }
      for (const item of posts) {
        revisions.push({
          siteId,
          entityType: "post",
          entityId: String(item.id),
          snapshot: JSON.stringify({ layout: item.draftLayout }),
          createdBy: actorId,
          createdEmail: actorEmail,
        });
        tx.update(post)
          .set({
            layout: item.draftLayout!,
            draftLayout: null,
            status: "published",
            publishedAt: new Date(),
            scheduledAt: null,
          })
          .where(and(eq(post.siteId, siteId), eq(post.id, item.id)))
          .run();
      }
      for (const item of companyPages) {
        revisions.push({
          siteId,
          entityType: "company",
          entityId: String(item.companyId),
          snapshot: JSON.stringify({ layout: item.draftLayout }),
          createdBy: actorId,
          createdEmail: actorEmail,
        });
        tx.update(companyPage)
          .set({ layout: item.draftLayout!, draftLayout: null })
          .where(
            and(eq(companyPage.siteId, siteId), eq(companyPage.id, item.id)),
          )
          .run();
      }
      if (revisions.length) tx.insert(contentRevision).values(revisions).run();
      if (fields.length)
        tx.update(pageContent)
          .set({ value: sql`${pageContent.draftValue}`, draftValue: null })
          .where(
            and(
              eq(pageContent.siteId, siteId),
              isNotNull(pageContent.draftValue),
            ),
          )
          .run();
      const summary: PublicationSummary = {
        layouts: layouts.length,
        pages: pages.length,
        posts: posts.length,
        companyPages: companyPages.length,
        contentFields: fields.length,
      };
      tx.insert(sitePublication)
        .values({
          id: publicationId,
          siteId,
          status: "succeeded",
          summary: JSON.stringify(summary),
          createdBy: actorId,
          createdEmail: actorEmail,
        })
        .run();
      tx.insert(auditLog)
        .values({
          siteId,
          userId: actorId,
          userEmail: actorEmail,
          action: "site.publish",
          entity: `site:${siteId}`,
          detail: JSON.stringify(summary),
        })
        .run();
      return summary;
    });
    void emitWebhook(siteId, "site.published", { publicationId, summary });
    return { id: publicationId, summary };
  } catch (error) {
    db.insert(sitePublication)
      .values({
        id: publicationId,
        siteId,
        status: "failed",
        summary: "{}",
        error: error instanceof Error ? error.message : "Publishing failed",
        createdBy: actorId,
        createdEmail: actorEmail,
      })
      .run();
    throw error;
  }
}
