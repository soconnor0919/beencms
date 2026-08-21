"use client";

import { useState } from "react";
import { ExternalLink, Globe, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";

export default function SitesPage() {
  const { data: sites = [] } = api.platform.sites.useQuery();
  const saveSite = api.platform.saveSite.useMutation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const create = async () => {
    try {
      const result = await saveSite.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        locale: "en-US",
        timezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          "America/New_York",
        status: "active",
      });
      const response = await fetch("/api/admin/site", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteId: result.id }),
      });
      if (!response.ok)
        throw new Error("Site created, but it could not be selected");
      window.location.assign("/admin/onboarding");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create the site",
      );
    }
  };
  const select = async (siteId: string) => {
    const response = await fetch("/api/admin/site", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ siteId }),
    });
    if (!response.ok) {
      toast.error("Could not switch sites");
      return;
    }
    window.location.assign("/admin");
  };
  return (
    <PageContent
      maxWidth="max-w-5xl"
      header={
        <PageHeader
          title="Sites"
          description="Create and manage independent websites from one hadlockCMS account."
          actions={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus data-icon="inline-start" />
                  New site
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a site</DialogTitle>
                </DialogHeader>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="site-name">Site name</FieldLabel>
                    <Input
                      id="site-name"
                      value={name}
                      onChange={(event) => {
                        const value = event.target.value;
                        setName(value);
                        setSlug(
                          value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-|-$/g, ""),
                        );
                      }}
                      placeholder="Northstar Photography"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="site-slug">Workspace slug</FieldLabel>
                    <Input
                      id="site-slug"
                      value={slug}
                      onChange={(event) =>
                        setSlug(
                          event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        )
                      }
                      placeholder="northstar-photography"
                    />
                    <FieldDescription>
                      Used internally and must be unique. You can connect a
                      public domain later.
                    </FieldDescription>
                  </Field>
                </FieldGroup>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={
                      !name.trim() || !slug.trim() || saveSite.isPending
                    }
                    onClick={() => void create()}
                  >
                    {saveSite.isPending ? "Creating…" : "Create and configure"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        {sites.map((site) => (
          <Card key={site.id}>
            <CardHeader>
              <CardTitle>{site.name}</CardTitle>
              <CardDescription>
                {site.hostname ?? `${site.slug} workspace`}
              </CardDescription>
              <CardAction>
                <Badge variant="secondary">{site.role}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>
                {site.locale} · {site.timezone}
              </p>
              <p className="capitalize">{site.status}</p>
            </CardContent>
            <CardFooter className="gap-2">
              <Button onClick={() => void select(site.id)}>
                Open dashboard
              </Button>
              {site.hostname ? (
                <Button asChild variant="outline">
                  <a
                    href={`https://${site.hostname}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink data-icon="inline-start" />
                    View site
                  </a>
                </Button>
              ) : null}
            </CardFooter>
          </Card>
        ))}
      </div>
      {!sites.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No sites yet</CardTitle>
            <CardDescription>
              Create your first site to begin onboarding.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setOpen(true)}>
              <Globe data-icon="inline-start" />
              Create your first site
            </Button>
          </CardFooter>
        </Card>
      ) : null}
    </PageContent>
  );
}
