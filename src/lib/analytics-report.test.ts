import { describe, expect, it, vi } from "vitest";
import { buildAnalyticsReport, type ReportEvent } from "~/lib/analytics-report";

describe("analytics reporting", () => {
  it("summarizes traffic without retaining visitor identities", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T12:00:00Z"));
    const events: ReportEvent[] = [
      {
        kind: "pageview",
        name: null,
        path: "/work",
        referrer: "example.com",
        visitorHash: "daily-hash-a",
        device: "mobile",
        createdAt: new Date("2026-08-21T10:00:00Z"),
      },
      {
        kind: "pageview",
        name: null,
        path: "/work",
        referrer: null,
        visitorHash: "daily-hash-b",
        device: "desktop",
        createdAt: new Date("2026-08-21T11:00:00Z"),
      },
      {
        kind: "conversion",
        name: "contact_form",
        path: "/contact",
        referrer: null,
        visitorHash: "daily-hash-b",
        device: "desktop",
        createdAt: new Date("2026-08-21T11:05:00Z"),
      },
    ];
    const report = buildAnalyticsReport(events, 7);
    expect(report.pageviews).toBe(2);
    expect(report.visitors).toBe(2);
    expect(report.conversionRate).toBe(50);
    expect(report.topPages[0]).toEqual({ label: "/work", count: 2 });
    expect(report.series.at(-1)).toEqual({ date: "2026-08-21", count: 2 });
    vi.useRealTimers();
  });
});
