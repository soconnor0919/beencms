"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";
import { api } from "~/trpc/react";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";

export default function PagesPage() {
  const { data: pages = [], refetch } = api.pages.getAll.useQuery();
  const save = api.pages.upsert.useMutation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [locale, setLocale] = useState("en-US");
  const create = async () => {
    try {
      await save.mutateAsync({
        title,
        slug,
        locale,
        status: "draft",
        noIndex: false,
      });
      setOpen(false);
      setTitle("");
      setSlug("");
      await refetch();
      toast.success("Page created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Page could not be created",
      );
    }
  };
  return (
    <PageContent
      maxWidth="max-w-5xl"
      header={
        <PageHeader
          title="Pages"
          description="Create localized landing pages with custom paths and publishing schedules."
          actions={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 size-4" />
              New page
            </Button>
          }
        />
      }
    >
      <Card>
        <CardContent className="p-0">
          {pages.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No dynamic pages yet. Existing fixed pages remain available under
              Page Content.
            </div>
          ) : (
            <div className="divide-y">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      className="font-medium hover:text-primary"
                      href={`/admin/pages/${page.id}`}
                    >
                      {page.title}
                    </Link>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      /{page.slug} · {page.locale}
                    </p>
                  </div>
                  <Badge
                    variant={
                      page.status === "published" ? "default" : "secondary"
                    }
                  >
                    {page.status.replace("_", " ")}
                  </Badge>
                  {page.status === "published" ? (
                    <Button size="icon" variant="ghost" asChild>
                      <Link
                        href={`/${page.slug}`}
                        target="_blank"
                        aria-label="View published page"
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (!slug)
                    setSlug(
                      event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, ""),
                    );
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Path</Label>
              <div className="flex items-center">
                <span className="rounded-l-md border border-r-0 bg-muted px-3 py-2 text-sm">
                  /
                </span>
                <Input
                  className="rounded-l-none"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  placeholder="services/example"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Locale</Label>
              <Input
                value={locale}
                onChange={(event) => setLocale(event.target.value)}
                placeholder="en-US"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title || !slug || save.isPending}
              onClick={() => void create()}
            >
              Create page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
