import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

function PostCardSkeleton() {
  return (
    <div className="rounded-2xl border border-stone dark:border-border bg-white dark:bg-card overflow-hidden animate-pulse">
      <div className="h-48 bg-muted" />
      <div className="p-6 space-y-3">
        <div className="h-4 w-20 bg-muted rounded-full" />
        <div className="h-6 w-3/4 bg-muted rounded" />
        <div className="space-y-2 mt-2">
          <div className="h-3 w-full bg-muted rounded" />
          <div className="h-3 w-4/5 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

async function PostGrid({ kind }: { kind?: "news" | "article" }) {
  const ctx = await createTRPCContext({ headers: await headers() });
  const caller = createCaller(ctx);
  const posts = await caller.posts.getAll({ kind });

  if (posts.length === 0) {
    return (
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-stone dark:border-border bg-cream dark:bg-muted p-16 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No posts published yet. Check back soon.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group rounded-2xl border border-stone dark:border-border bg-white dark:bg-card overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              {post.coverImage ? (
                <div className="h-48 overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="h-48 bg-olive/8 dark:bg-olive/5 flex items-center justify-center">
                  <span className="font-serif text-4xl text-olive/20 group-hover:text-olive/30 transition-colors">
                    {post.title.charAt(0)}
                  </span>
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {post.kind}
                  </span>
                  {post.category && (
                    <span className="text-xs font-semibold uppercase tracking-widest text-olive">
                      {post.category}
                    </span>
                  )}
                </div>
                <h2 className="mt-1.5 font-serif text-lg font-bold text-charcoal dark:text-foreground group-hover:text-olive dark:group-hover:text-olive-light transition-colors line-clamp-2">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                )}
                {post.publishedAt && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
                {post.byline ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    By {post.byline}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const requested = (await searchParams).type;
  const kind =
    requested === "news" || requested === "article" ? requested : undefined;
  return (
    <>
      <section className="bg-cream dark:bg-muted px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-serif text-5xl font-bold text-charcoal dark:text-foreground">
            News & Articles
          </h1>
          <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            Stories, updates, and insights from our team.
          </p>
          <nav
            aria-label="Filter stories"
            className="mt-7 flex justify-center gap-2"
          >
            {(
              [
                ["All", "/blog"],
                ["News", "/blog?type=news"],
                ["Articles", "/blog?type=article"],
              ] as const
            ).map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${(!kind && label === "All") || kind === label.toLowerCase().replace(/s$/, "") ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <Suspense
        fallback={
          <section className="px-6 py-20">
            <div className="mx-auto max-w-5xl">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <PostCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </section>
        }
      >
        <PostGrid kind={kind} />
      </Suspense>
    </>
  );
}
