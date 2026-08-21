export type ReportEvent = {
  kind: "pageview" | "conversion" | "outbound_click";
  name: string | null;
  path: string;
  referrer: string | null;
  visitorHash: string | null;
  device: "desktop" | "tablet" | "mobile" | "unknown";
  createdAt: Date;
};

function ranked(values: Array<string | null>, fallback: string) {
  const counts = new Map<string, number>();
  for (const value of values)
    counts.set(value || fallback, (counts.get(value || fallback) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function buildAnalyticsReport(events: ReportEvent[], days: number) {
  const pageviews = events.filter((event) => event.kind === "pageview");
  const conversions = events.filter((event) => event.kind === "conversion");
  const visitorHashes = new Set(
    pageviews.map((event) => event.visitorHash).filter(Boolean),
  );
  const series = new Map<string, number>();
  const now = new Date();
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - offset);
    series.set(date.toISOString().slice(0, 10), 0);
  }
  for (const event of pageviews) {
    const day = event.createdAt.toISOString().slice(0, 10);
    if (series.has(day)) series.set(day, (series.get(day) ?? 0) + 1);
  }
  return {
    pageviews: pageviews.length,
    visitors: visitorHashes.size,
    conversions: conversions.length,
    conversionRate: pageviews.length
      ? Math.round((conversions.length / pageviews.length) * 10_000) / 100
      : 0,
    topPages: ranked(
      pageviews.map((event) => event.path),
      "/",
    ).slice(0, 10),
    referrers: ranked(
      pageviews.map((event) => event.referrer),
      "Direct / private",
    ).slice(0, 10),
    devices: ranked(
      pageviews.map((event) => event.device),
      "unknown",
    ),
    conversionsByName: ranked(
      conversions.map((event) => event.name),
      "conversion",
    ),
    series: [...series.entries()].map(([date, count]) => ({ date, count })),
  };
}
