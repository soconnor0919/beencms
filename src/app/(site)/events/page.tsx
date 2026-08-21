import Link from "next/link";
import { CalendarDays, Clock, MapPin, Rss } from "lucide-react";
import { headers } from "next/headers";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

export default async function EventsPage() {
  const caller = createCaller(await createTRPCContext({ headers: await headers() }));
  const events = await caller.calendar.getUpcoming({ limit: 100 });
  return <>
    <section className="bg-cream px-6 py-20 text-center dark:bg-muted">
      <CalendarDays className="mx-auto h-10 w-10 text-primary" />
      <h1 className="mt-4 font-serif text-5xl font-bold">Events</h1>
      <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Upcoming gatherings, programs, and important dates.</p>
      <Link href="/calendar.ics" className="mt-6 inline-flex items-center gap-2 rounded-full border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted">
        <Rss className="h-4 w-4" /> Subscribe to calendar
      </Link>
    </section>
    <section className="mx-auto max-w-4xl px-6 py-16">
      {events.length ? <div className="space-y-5">{events.map((event) => <article key={event.id} className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row">
          <time className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary" dateTime={event.startAt.toISOString()}>
            <span className="text-xs font-semibold uppercase">{event.startAt.toLocaleDateString("en-US", { month: "short" })}</span>
            <span className="text-3xl font-bold leading-none">{event.startAt.getDate()}</span>
          </time>
          <div><h2 className="font-serif text-2xl font-bold">{event.title}</h2>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{event.allDay ? "All day" : event.startAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
              {event.location ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{event.location}</span> : null}
            </div>
            {event.description ? <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">{event.description}</p> : null}
            {event.url ? <a href={event.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Event details →</a> : null}
          </div>
        </div>
      </article>)}</div> : <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">No upcoming events yet.</div>}
    </section>
  </>;
}
