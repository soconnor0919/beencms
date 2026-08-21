import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { headers } from "next/headers";
import Link from "next/link";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import BlockRenderer from "~/components/BlockRenderer";
import type { Block } from "~/lib/blocks";
import { verifyPreviewToken } from "~/lib/preview-token";
import { db } from "~/server/db";
import { post as postTable } from "~/server/db/schema";
import { and, eq } from "drizzle-orm";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await createTRPCContext({ headers: await headers() });
  const item = await createCaller(ctx).posts.getBySlug({ slug });
  return item
    ? {
        title: item.seoTitle ?? item.title,
        description: item.seoDescription ?? item.excerpt,
        alternates: item.canonical ? { canonical: item.canonical } : undefined,
        robots: item.noIndex ? { index: false, follow: false } : undefined,
        openGraph: {
          type: "article",
          title: item.seoTitle ?? item.title,
          description: item.seoDescription ?? item.excerpt ?? undefined,
          images:
            item.ogImage || item.coverImage
              ? [item.ogImage ?? item.coverImage!]
              : undefined,
        },
      }
    : {};
}

export default async function BlogPostPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview: previewToken } = await searchParams;
  const ctx = await createTRPCContext({ headers: await headers() });
  const caller = createCaller(ctx);
  const { isEnabled: isDraft } = await draftMode();

  const publishedPost = await caller.posts.getBySlug({ slug });
  let previewPost: Awaited<ReturnType<typeof caller.posts.getDraftBySlug>> =
    null;
  if (isDraft) {
    try {
      previewPost = await caller.posts.getDraftBySlug({ slug });
    } catch {
      // A stale draft cookie without an editor session falls back to published content.
    }
  }
  if (
    !previewPost &&
    verifyPreviewToken(previewToken, `${ctx.siteId}:post:${slug}`)
  ) {
    previewPost =
      db
        .select()
        .from(postTable)
        .where(and(eq(postTable.siteId, ctx.siteId), eq(postTable.slug, slug)))
        .get() ?? null;
  }
  const post = previewPost ?? publishedPost;

  if (!post) {
    const moved = await caller.redirects.get({ fromPath: `/blog/${slug}` });
    if (moved) redirect(moved.toPath);
    notFound();
  }

  let blocks: Block[] = [];
  try {
    const draft = previewPost?.draftLayout
      ? (JSON.parse(previewPost.draftLayout) as Block[])
      : null;
    const live = post.layout ? (JSON.parse(post.layout) as Block[]) : [];
    blocks = draft ?? live;
  } catch {
    blocks = [];
  }

  return (
    <>
      {/* Post hero */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": post.kind === "news" ? "NewsArticle" : "Article",
            headline: post.title,
            datePublished: post.publishedAt,
            image: post.coverImage,
            author: post.byline
              ? { "@type": "Person", name: post.byline }
              : undefined,
          }).replace(/</g, "\\u003c"),
        }}
      />
      <section className="bg-cream dark:bg-muted px-6 py-20">
        <div className="mx-auto max-w-3xl">
          {post.category && (
            <Link
              href="/blog"
              className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest text-olive hover:text-olive-dark transition-colors"
            >
              ← {post.category}
            </Link>
          )}
          {!post.category && (
            <Link
              href="/blog"
              className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest text-olive hover:text-olive-dark transition-colors"
            >
              ← All Posts
            </Link>
          )}
          <h1 className="font-serif text-4xl font-bold text-charcoal dark:text-foreground md:text-5xl">
            {post.title}
          </h1>
          <span className="mt-4 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            {post.kind}
          </span>
          {post.excerpt && (
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
              {post.excerpt}
            </p>
          )}
          {(post.byline || post.publishedAt) && (
            <p className="mt-4 text-sm text-muted-foreground">
              {post.byline ? `By ${post.byline}` : null}
              {post.byline && post.publishedAt ? " · " : null}
              {post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : null}
            </p>
          )}
        </div>
      </section>

      {/* Cover image */}
      {post.coverImage && (
        <div className="px-6">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImage}
              alt={post.title}
              className="h-72 w-full object-cover md:h-96"
            />
          </div>
        </div>
      )}

      {/* Block content */}
      {blocks.length > 0 && <BlockRenderer blocks={blocks} />}

      {/* Fallback if no content */}
      {blocks.length === 0 && (
        <section className="px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-muted-foreground">Content coming soon.</p>
          </div>
        </section>
      )}

      {post.sourceUrl ? (
        <div className="mx-auto max-w-3xl px-6 pb-10">
          <a
            href={post.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            Read the original source →
          </a>
        </div>
      ) : null}

      {/* Back to blog */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-3xl border-t pt-10">
          <Link
            href="/blog"
            className="text-sm font-medium text-olive hover:text-olive-dark transition-colors"
          >
            ← Back to Blog
          </Link>
        </div>
      </section>
    </>
  );
}
