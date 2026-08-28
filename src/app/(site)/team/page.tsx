import { Suspense } from "react";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { headers } from "next/headers";

// ─── Skeletons ────────────────────────────────────────────────────────────────

function MemberCardSkeleton() {
  return (
    <div className="rounded-2xl border border-stone dark:border-border bg-white dark:bg-card p-8 text-center shadow-sm animate-pulse">
      <div className="mx-auto mb-5 h-24 w-24 rounded-full bg-muted" />
      <div className="h-5 w-36 bg-muted rounded mx-auto" />
      <div className="mt-2 h-4 w-24 bg-muted rounded mx-auto" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-4/5 bg-muted rounded mx-auto" />
        <div className="h-3 w-3/5 bg-muted rounded mx-auto" />
      </div>
    </div>
  );
}

function TeamSkeleton() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <MemberCardSkeleton />
          <MemberCardSkeleton />
          <MemberCardSkeleton />
        </div>
      </div>
    </section>
  );
}

// ─── Data component ───────────────────────────────────────────────────────────

async function TeamList() {
  const ctx = await createTRPCContext({ headers: await headers() });
  const caller = createCaller(ctx);
  const members = await caller.team.getAll();

  const board = members.filter((m) => !m.isAffiliate);
  const affiliates = members.filter((m) => m.isAffiliate);

  if (members.length === 0) {
    return (
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-stone dark:border-border bg-cream dark:bg-muted p-16 text-center">
            <h2 className="font-serif text-2xl font-bold text-charcoal dark:text-foreground">
              Team Coming Soon
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              We&apos;re building our team page. Check back soon.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl space-y-20">
        {/* Board / Staff */}
        {board.length > 0 && (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {board.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-stone dark:border-border bg-white dark:bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Avatar area */}
                <div className="flex items-center justify-center bg-olive/5 dark:bg-olive/10 pt-10 pb-6">
                  {member.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.imageUrl}
                      alt={member.name}
                      className="h-28 w-28 rounded-full object-cover ring-4 ring-white dark:ring-card shadow"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-olive/15 ring-4 ring-white dark:ring-card shadow">
                      <span className="font-serif text-3xl font-bold text-olive">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-8 pb-8 pt-4 text-center">
                  <h3 className="font-serif text-xl font-semibold text-charcoal dark:text-foreground">
                    {member.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-olive">
                    {member.role}
                  </p>
                  {member.bio && (
                    <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-4">
                      {member.bio}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Affiliates */}
        {affiliates.length > 0 && (
          <div>
            <div className="mb-10 text-center">
              <h2 className="font-serif text-3xl font-bold text-charcoal dark:text-foreground">
                Affiliates
              </h2>
              <p className="mt-3 text-gray-600 dark:text-gray-400">
                Partners and advisors who support our work.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {affiliates.map((member) => (
                <div
                  key={member.id}
                  className="rounded-xl border border-stone dark:border-border bg-white dark:bg-card px-6 py-5 text-center hover:shadow-sm transition-shadow"
                >
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-olive/10">
                    <span className="font-serif text-lg font-bold text-olive">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                  </div>
                  <p className="font-semibold text-charcoal dark:text-foreground leading-snug">
                    {member.name}
                  </p>
                  <p className="mt-1 text-sm text-olive">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  return (
    <>
      <section className="bg-cream dark:bg-muted px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-serif text-5xl font-bold text-charcoal dark:text-foreground">
            The Team
          </h1>
          <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            Meet the people, partners, and advisors behind our work.
          </p>
        </div>
      </section>

      <Suspense fallback={<TeamSkeleton />}>
        <TeamList />
      </Suspense>
    </>
  );
}
