import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "~/server/db";
import { calendarEvent, siteSettings } from "~/server/db/schema";
import { appDefaults } from "~/config/cms";
import { resolvePublicSiteId } from "~/lib/sites";

export const dynamic = "force-dynamic";

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function utc(value: Date) {
  return value
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10).replace(/-/g, "");
}

export async function GET(request: Request) {
  const siteId = await resolvePublicSiteId(request.headers);
  const events = db
    .select()
    .from(calendarEvent)
    .where(
      and(
        eq(calendarEvent.siteId, siteId),
        eq(calendarEvent.status, "published"),
        gte(calendarEvent.endAt, new Date()),
      ),
    )
    .orderBy(asc(calendarEvent.startAt))
    .all();
  const settings = db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.siteId, siteId))
    .get();
  const calendarName = `${settings?.siteName ?? appDefaults.name} Events`;
  const host = new URL(request.url).host;
  const rows = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "PRODID:-//hadlockCMS//Events Calendar//EN",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    ...events.flatMap((event) => {
      const timing = event.allDay
        ? [
            `DTSTART;VALUE=DATE:${dateOnly(event.startAt)}`,
            `DTEND;VALUE=DATE:${dateOnly(new Date(event.endAt.getTime() + 86_400_000))}`,
          ]
        : [`DTSTART:${utc(event.startAt)}`, `DTEND:${utc(event.endAt)}`];
      return [
        "BEGIN:VEVENT",
        `UID:event-${event.id}@${host}`,
        `DTSTAMP:${utc(event.updatedAt ?? event.createdAt)}`,
        ...timing,
        `SUMMARY:${escapeIcs(event.title)}`,
        ...(event.description
          ? [`DESCRIPTION:${escapeIcs(event.description)}`]
          : []),
        ...(event.location ? [`LOCATION:${escapeIcs(event.location)}`] : []),
        ...(event.url ? [`URL:${event.url}`] : []),
        "END:VEVENT",
      ];
    }),
    "END:VCALENDAR",
    "",
  ];
  return new Response(rows.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="events.ics"',
      "Cache-Control": "public, max-age=300",
    },
  });
}
