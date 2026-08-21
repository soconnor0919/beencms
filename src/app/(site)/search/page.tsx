import Link from "next/link";
import { headers } from "next/headers";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  const ctx = await createTRPCContext({ headers: await headers() });
  const results =
    query.length >= 2
      ? await createCaller(ctx).library.search({ query, limit: 30 })
      : [];
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-4xl font-bold">Search</h1>
        <form className="mt-8 flex gap-2">
          <input
            aria-label="Search the site"
            name="q"
            defaultValue={query}
            className="min-w-0 flex-1 rounded-md border bg-background px-4 py-2"
            placeholder="Search pages, articles, programs, and people"
          />
          <button className="rounded-md bg-primary px-5 py-2 text-primary-foreground">
            Search
          </button>
        </form>
        {query.length > 0 && query.length < 2 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Enter at least two characters.
          </p>
        ) : null}
        {query.length >= 2 ? (
          <div className="mt-10">
            <p className="mb-4 text-sm text-muted-foreground">
              {results.length} result{results.length === 1 ? "" : "s"} for “
              {query}”
            </p>
            <div className="divide-y">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  className="block py-5"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {result.type}
                  </span>
                  <h2 className="mt-1 text-xl font-semibold">{result.title}</h2>
                  {result.excerpt ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {result.excerpt}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
            {results.length === 0 ? (
              <p className="rounded-lg border p-8 text-center text-muted-foreground">
                No matching content found.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
