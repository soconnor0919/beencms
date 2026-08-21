"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";
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
} from "~/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";

export default function IntegrationsPage() {
  const currentSite = api.platform.currentSite.useQuery();
  const webhooks = api.platform.webhooks.useQuery();
  const saveSite = api.platform.saveSite.useMutation();
  const verifyDomain = api.platform.verifyDomain.useMutation();
  const rotateToken = api.platform.rotateMcpToken.useMutation();
  const saveWebhook = api.platform.saveWebhook.useMutation();
  const deleteWebhook = api.platform.deleteWebhook.useMutation();
  const testWebhook = api.platform.testWebhook.useMutation();
  const [site, setSite] = useState({
    hostname: "",
    locale: "en-US",
    timezone: "America/New_York",
  });
  const [token, setToken] = useState<string | null>(null);
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhook, setWebhook] = useState({
    name: "",
    url: "",
    events: "content.published,form.submitted",
    active: true,
  });
  useEffect(() => {
    if (currentSite.data)
      setSite({
        hostname: currentSite.data.hostname ?? "",
        locale: currentSite.data.locale,
        timezone: currentSite.data.timezone,
      });
  }, [currentSite.data]);

  const saveDomain = async () => {
    const active = currentSite.data;
    if (!active) return;
    await saveSite.mutateAsync({
      id: active.id,
      name: active.name,
      slug: active.slug,
      hostname: site.hostname.trim().toLowerCase() || null,
      locale: site.locale,
      timezone: site.timezone,
      status: active.status,
    });
    await currentSite.refetch();
    toast.success("Site routing updated");
  };
  const generateToken = async () => {
    const result = await rotateToken.mutateAsync();
    setToken(result.token);
    toast.success("New site-scoped MCP token generated");
  };

  return (
    <PageContent
      maxWidth="max-w-5xl"
      header={
        <PageHeader
          title="Integrations"
          description="Connect the active site to domains, agents, webhooks, and external services."
          actions={
            <Button onClick={() => setWebhookOpen(true)}>
              <Plus data-icon="inline-start" />
              Add webhook
            </Button>
          }
        />
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Custom domain</CardTitle>
            <CardDescription>
              Requests for this hostname resolve only to the active site’s
              content and design.
            </CardDescription>
            <CardAction>
              <Badge
                variant={
                  currentSite.data?.domainStatus === "verified"
                    ? "secondary"
                    : "outline"
                }
              >
                {currentSite.data?.domainStatus ?? "unconfigured"}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="hostname">Hostname</FieldLabel>
                <Input
                  id="hostname"
                  value={site.hostname}
                  onChange={(event) =>
                    setSite((current) => ({
                      ...current,
                      hostname: event.target.value,
                    }))
                  }
                  placeholder="www.example.com"
                />
                <FieldDescription>
                  Enter a hostname without https:// or a path. Point its DNS to
                  this hadlockCMS installation.
                </FieldDescription>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="locale">Default locale</FieldLabel>
                  <Input
                    id="locale"
                    value={site.locale}
                    onChange={(event) =>
                      setSite((current) => ({
                        ...current,
                        locale: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
                  <Input
                    id="timezone"
                    value={site.timezone}
                    onChange={(event) =>
                      setSite((current) => ({
                        ...current,
                        timezone: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
              {currentSite.data?.hostname &&
              currentSite.data.domainVerificationToken &&
              currentSite.data.domainStatus !== "verified" ? (
                <Field>
                  <FieldLabel>DNS ownership record</FieldLabel>
                  <FieldDescription>
                    Add this TXT record with your DNS provider, wait for DNS to
                    propagate, then verify ownership. Traffic is not routed to
                    this site until verification succeeds.
                  </FieldDescription>
                  <div className="flex flex-col gap-2 rounded-lg border p-3 font-mono text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate">
                        _hadlockcms.{currentSite.data.hostname}
                      </span>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Copy TXT record name"
                        onClick={() =>
                          void navigator.clipboard.writeText(
                            `_hadlockcms.${currentSite.data?.hostname ?? ""}`,
                          )
                        }
                      >
                        <Copy />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate">
                        hadlockcms-verification=
                        {currentSite.data.domainVerificationToken}
                      </span>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Copy TXT record value"
                        onClick={() =>
                          void navigator.clipboard.writeText(
                            `hadlockcms-verification=${currentSite.data?.domainVerificationToken ?? ""}`,
                          )
                        }
                      >
                        <Copy />
                      </Button>
                    </div>
                  </div>
                </Field>
              ) : null}
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            {currentSite.data?.hostname &&
            currentSite.data.domainStatus !== "verified" ? (
              <Button
                variant="outline"
                disabled={verifyDomain.isPending}
                onClick={async () => {
                  const result = await verifyDomain.mutateAsync();
                  await currentSite.refetch();
                  toast[result.verified ? "success" : "error"](
                    result.verified
                      ? "Domain ownership verified"
                      : "TXT record was not found yet",
                  );
                }}
              >
                {verifyDomain.isPending ? "Checking…" : "Verify DNS"}
              </Button>
            ) : null}
            <Button
              onClick={() => void saveDomain()}
              disabled={!currentSite.data || saveSite.isPending}
            >
              Save routing
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Agent control with MCP</CardTitle>
            <CardDescription>
              Generate a credential that can control only this site. Rotating it
              immediately invalidates the previous token.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {token ? (
              <Field>
                <FieldLabel>New token—copy it now</FieldLabel>
                <div className="flex gap-2">
                  <Input readOnly value={token} className="font-mono" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(token);
                      toast.success("Token copied");
                    }}
                  >
                    <Copy data-icon="inline-start" />
                    Copy
                  </Button>
                </div>
                <FieldDescription>
                  Use <code>/api/mcp</code> with the bearer token. On a shared
                  CMS hostname, also send{" "}
                  <code>x-hadlockcms-site: {currentSite.data?.slug}</code>. This
                  token is not shown again.
                </FieldDescription>
              </Field>
            ) : (
              <p className="text-sm text-muted-foreground">
                No credential is visible. Generate one when you are ready to
                connect an agent.
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => void generateToken()}
              disabled={rotateToken.isPending}
            >
              <KeyRound data-icon="inline-start" />
              {rotateToken.isPending
                ? "Generating…"
                : "Generate or rotate token"}
            </Button>
          </CardFooter>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Signed webhooks</CardTitle>
          <CardDescription>
            Site-specific event deliveries signed with an endpoint secret.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {webhooks.data?.length ? (
            webhooks.data.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.url}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const result = await testWebhook.mutateAsync({
                      id: item.id,
                    });
                    toast[result.ok ? "success" : "error"](
                      result.ok
                        ? `Webhook responded ${result.status}`
                        : "Webhook test failed",
                    );
                  }}
                >
                  <Send data-icon="inline-start" />
                  Test
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${item.name}`}
                  onClick={async () => {
                    await deleteWebhook.mutateAsync({ id: item.id });
                    await webhooks.refetch();
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No webhooks configured for this site.
            </p>
          )}
        </CardContent>
      </Card>
      <Dialog open={webhookOpen} onOpenChange={setWebhookOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add webhook</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="webhook-name">Name</FieldLabel>
              <Input
                id="webhook-name"
                value={webhook.name}
                onChange={(event) =>
                  setWebhook((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="webhook-url">Endpoint URL</FieldLabel>
              <Input
                id="webhook-url"
                type="url"
                value={webhook.url}
                onChange={(event) =>
                  setWebhook((current) => ({
                    ...current,
                    url: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="webhook-events">Events</FieldLabel>
              <Input
                id="webhook-events"
                value={webhook.events}
                onChange={(event) =>
                  setWebhook((current) => ({
                    ...current,
                    events: event.target.value,
                  }))
                }
              />
              <FieldDescription>Comma-separated event names.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebhookOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!webhook.name || !webhook.url}
              onClick={async () => {
                await saveWebhook.mutateAsync({
                  ...webhook,
                  events: webhook.events
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                });
                await webhooks.refetch();
                setWebhookOpen(false);
              }}
            >
              Save webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
