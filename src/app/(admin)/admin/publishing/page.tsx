"use client";

import { Rocket } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export default function PublishingPage() {
  const overview = api.publishing.overview.useQuery();
  const publish = api.publishing.publishAll.useMutation();
  const drafts = overview.data?.drafts ?? [];

  const publishAll = async () => {
    if (
      !confirm(
        `Publish all ${drafts.length} pending content groups to the live site?`,
      )
    )
      return;
    try {
      const result = await publish.mutateAsync();
      await overview.refetch();
      const total = Object.values(result.summary).reduce(
        (sum, count) => sum + count,
        0,
      );
      toast.success(`Published ${total} changes atomically`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publishing failed");
    }
  };

  return (
    <PageContent
      maxWidth="max-w-5xl"
      header={
        <PageHeader
          title="Publishing"
          description="Review every pending draft and release the active site in one atomic publication."
          actions={
            <Button
              disabled={!drafts.length || publish.isPending}
              onClick={() => void publishAll()}
            >
              <Rocket data-icon="inline-start" />
              {publish.isPending
                ? "Publishing…"
                : `Publish ${drafts.length} groups`}
            </Button>
          }
        />
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Pending changes</CardTitle>
            <CardDescription>
              Published content remains unchanged until this release succeeds.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {drafts.length ? (
              drafts.map((draft) => (
                <div
                  key={`${draft.type}:${draft.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
                >
                  <span className="truncate text-sm font-medium">
                    {draft.title}
                  </span>
                  <Badge variant="outline">{draft.type}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                The live site is up to date. Editing a page, post, program, or
                reusable layout will add it here.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Publication history</CardTitle>
            <CardDescription>
              The latest site-wide releases and their outcomes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex max-h-[620px] flex-col gap-3 overflow-y-auto">
            {overview.data?.history.length ? (
              overview.data.history.map((publication) => {
                const total = Object.values(publication.summary).reduce(
                  (sum, count) => sum + count,
                  0,
                );
                return (
                  <div
                    key={publication.id}
                    className="flex flex-col gap-1 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge
                        variant={
                          publication.status === "succeeded"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {publication.status}
                      </Badge>
                      <time className="text-xs text-muted-foreground">
                        {new Date(publication.createdAt).toLocaleString()}
                      </time>
                    </div>
                    <p className="text-sm">
                      {publication.status === "succeeded"
                        ? `${total} changes published`
                        : publication.error}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {publication.createdEmail ?? "Unknown editor"}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                No site-wide publications yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContent>
  );
}
