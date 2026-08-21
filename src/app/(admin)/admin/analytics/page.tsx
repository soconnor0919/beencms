"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";

export default function AnalyticsPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const utils = api.useUtils();
  const { data, isLoading } = api.analytics.report.useQuery({ days });
  const update = api.analytics.updateSettings.useMutation({
    onSuccess: async () => {
      await utils.analytics.report.invalidate();
      toast.success("Analytics settings saved");
    },
    onError: (error) => toast.error(error.message),
  });
  const maximum = Math.max(
    1,
    ...(data?.series.map((item) => item.count) ?? []),
  );

  return (
    <PageContent
      maxWidth="max-w-6xl"
      header={
        <PageHeader
          title="Analytics"
          description="Privacy-conscious, cookieless traffic and conversion reporting for this site."
          actions={
            <Select
              value={String(days)}
              onValueChange={(value) => setDays(Number(value) as 7 | 30 | 90)}
            >
              <SelectTrigger aria-label="Reporting period" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      }
    >
      {isLoading || !data ? (
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Page views", data.pageviews.toLocaleString()],
              ["Unique visitors", data.visitors.toLocaleString()],
              ["Conversions", data.conversions.toLocaleString()],
              ["Conversion rate", `${data.conversionRate}%`],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardDescription>{label}</CardDescription>
                  <CardTitle className="text-3xl">{value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Traffic over time</CardTitle>
              <CardDescription>Page views per UTC day</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="flex h-48 items-end gap-1"
                role="img"
                aria-label={`Daily page views over ${days} days`}
              >
                {data.series.map((item) => (
                  <div
                    key={item.date}
                    className="group relative flex min-w-0 flex-1 items-end"
                    title={`${item.date}: ${item.count} views`}
                  >
                    <div
                      className="min-h-0.5 w-full rounded-t bg-primary/75 transition-colors hover:bg-primary"
                      style={{ height: `${(item.count / maximum) * 100}%` }}
                    />
                    <span className="sr-only">
                      {item.date}: {item.count} views
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {[
              ["Top pages", data.topPages],
              ["Traffic sources", data.referrers],
              ["Devices", data.devices],
            ].map(([title, items]) => (
              <Card key={title as string}>
                <CardHeader>
                  <CardTitle>{title as string}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {(items as Array<{ label: string; count: number }>).map(
                      (item) => (
                        <li
                          key={item.label}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="truncate">{item.label}</span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </li>
                      ),
                    )}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Privacy & retention</CardTitle>
              <CardDescription>
                No cookies or raw IP addresses are stored. Daily rotating hashes
                estimate unique visitors, and browser DNT/GPC signals are
                honored.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-5">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={data.settings.enabled}
                  disabled={!data.canManage || update.isPending}
                  onChange={(event) =>
                    update.mutate({
                      enabled: event.target.checked,
                      retentionDays: data.settings.retentionDays as
                        30 | 90 | 365,
                    })
                  }
                />
                Collect first-party analytics
              </label>
              <div className="space-y-1">
                <label htmlFor="analytics-retention" className="text-sm">
                  Data retention
                </label>
                <Select
                  value={String(data.settings.retentionDays)}
                  disabled={!data.canManage || update.isPending}
                  onValueChange={(value) =>
                    update.mutate({
                      enabled: data.settings.enabled,
                      retentionDays: Number(value) as 30 | 90 | 365,
                    })
                  }
                >
                  <SelectTrigger id="analytics-retention" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">365 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                disabled={!data.canManage || update.isPending}
                onClick={() =>
                  update.mutate({
                    enabled: data.settings.enabled,
                    retentionDays: data.settings.retentionDays as 30 | 90 | 365,
                  })
                }
              >
                Save settings
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </PageContent>
  );
}
