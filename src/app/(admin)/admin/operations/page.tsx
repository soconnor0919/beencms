"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function OperationsPage() {
  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const health = api.platform.health.useQuery();
  const operations = api.platform.operations.useQuery();
  const deliveries = api.platform.deliveries.useQuery();
  const importContent = async (file: File) => {
    setImporting(true);
    try {
      const response = await fetch("/api/admin/content-transfer", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hadlockcms-confirm": "MERGE",
        },
        body: await file.text(),
      });
      const result = (await response.json()) as {
        error?: string;
        imported?: Record<string, number>;
      };
      if (!response.ok) throw new Error(result.error ?? "Import failed");
      toast.success(
        `Imported ${Object.values(result.imported ?? {}).reduce((sum, count) => sum + count, 0)} records`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  };
  return (
    <PageContent
      maxWidth="max-w-6xl"
      header={
        <PageHeader
          title="Operations"
          description="Review service health, delivery failures, and downloadable backups."
          actions={
            <>
              <input
                ref={importRef}
                className="hidden"
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (
                    file &&
                    confirm(
                      "Merge this hadlockCMS export into the current site? Existing records with matching IDs will be updated.",
                    )
                  )
                    void importContent(file);
                }}
              />
              <Button
                variant="outline"
                disabled={importing}
                onClick={() => importRef.current?.click()}
              >
                {importing ? "Importing…" : "Import content"}
              </Button>
              <Button variant="outline" asChild>
                <a href="/api/admin/content-transfer">
                  Export portable content
                </a>
              </Button>
              <Button asChild>
                <a href="/api/admin/backup">Download database backup</a>
              </Button>
            </>
          }
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Status", value: health.data?.status ?? "Checking…" },
          { label: "Storage", value: health.data?.storage ?? "—" },
          {
            label: "Email",
            value: health.data?.emailConfigured
              ? `Configured (${health.data.emailProvider})`
              : "Not configured",
          },
          {
            label: "Spam protection",
            value: health.data?.spamProtection ? "Enabled" : "Not configured",
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-2 font-semibold capitalize">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application events</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[420px] space-y-2 overflow-y-auto">
            {operations.data?.length ? (
              operations.data.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex justify-between gap-3">
                    <span className="text-xs font-semibold uppercase">
                      {item.level}
                    </span>
                    <time className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <p className="mt-1 text-sm">{item.message}</p>
                  <p className="text-xs text-muted-foreground">{item.source}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No operational errors recorded.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Webhook deliveries</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[420px] space-y-2 overflow-y-auto">
            {deliveries.data?.length ? (
              deliveries.data.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p>{item.event}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.attemptedAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={
                      item.success ? "text-emerald-600" : "text-destructive"
                    }
                  >
                    {item.success
                      ? item.responseCode
                      : (item.error ?? "Failed")}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No webhook deliveries yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContent>
  );
}
