import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

// ─── Skeletons ────────────────────────────────────────────────────────────────

function ProgramCardSkeleton() {
  return (
    <div className="rounded-2xl border border-stone dark:border-border bg-white dark:bg-card overflow-hidden animate-pulse">
      <div className="h-52 bg-muted" />
      <div className="p-8 space-y-3">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="space-y-2 mt-2">
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-4/5 bg-muted rounded" />
          <div className="h-4 w-3/5 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

function ProgramsListSkeleton() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <ProgramCardSkeleton />
          <ProgramCardSkeleton />
        </div>
      </div>
    </section>
  );
}

// ─── Data component ───────────────────────────────────────────────────────────

async function ProgramsList() {
  const ctx = await createTRPCContext({ headers: await headers() });
  const caller = createCaller(ctx);
  const companies = await caller.companies.getAll();

  if (companies.length === 0) {
    return (
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-stone dark:border-border bg-cream dark:bg-muted p-16 text-center">
            <h2 className="font-serif text-2xl font-bold text-charcoal dark:text-foreground">
              Coming Soon
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Program details are being prepared. Check back soon.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-block rounded-full bg-olive px-6 py-2 text-sm font-medium text-white hover:bg-olive-dark transition-colors"
            >
              Stay Updated
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {companies.map((company) => (
            <Link
              key={company.id}
              href={`/programs/${company.slug}`}
              className="group rounded-2xl border border-stone dark:border-border bg-white dark:bg-card overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              {company.imageUrl ? (
                <div className="h-52 bg-stone overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={company.imageUrl}
                    alt={company.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="h-52 bg-olive/10 flex items-center justify-center">
                  <span className="font-serif text-5xl text-olive/30 group-hover:text-olive/50 transition-colors">
                    {company.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="p-8">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-serif text-2xl font-bold text-charcoal dark:text-foreground group-hover:text-olive dark:group-hover:text-olive-light transition-colors">
                    {company.name}
                  </h2>
                  {company.status === "coming_soon" && (
                    <span className="shrink-0 rounded-full bg-olive/10 px-3 py-1 text-xs font-medium text-olive">
                      Coming Soon
                    </span>
                  )}
                </div>
                {company.tagline && (
                  <p className="mt-2 font-medium text-olive">
                    {company.tagline}
                  </p>
                )}
                {company.description && (
                  <p className="mt-3 text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                    {company.description}
                  </p>
                )}
                <p className="mt-5 text-sm font-medium text-olive">
                  Learn more →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProgramsPage() {
  return (
    <>
      <section className="bg-cream dark:bg-muted px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-serif text-5xl font-bold text-charcoal dark:text-foreground">
            Our Programs
          </h1>
          <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            Explore our programs, services, and current initiatives.
          </p>
        </div>
      </section>

      <Suspense fallback={<ProgramsListSkeleton />}>
        <ProgramsList />
      </Suspense>

      <section className="bg-charcoal px-6 py-24 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-serif text-3xl font-bold">
            The Apprenticeship Model
          </h2>
          <p className="mt-5 max-w-2xl mx-auto text-gray-300 leading-relaxed">
            Our programs combine practical experience, dedicated guidance, and a
            clear path toward measurable outcomes.
          </p>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3 text-left">
            {[
              {
                step: "01",
                title: "Begin",
                body: "Choose the program or service that fits your goals.",
              },
              {
                step: "02",
                title: "Build",
                body: "Develop skills and momentum with structured support.",
              },
              {
                step: "03",
                title: "Advance",
                body: "Apply what you have learned to reach the next milestone.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-xl bg-white/5 p-7">
                <div className="font-serif text-3xl font-bold text-olive-light">
                  {item.step}
                </div>
                <h3 className="mt-3 font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
