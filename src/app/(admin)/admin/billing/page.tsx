"use client";

import { Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { formatBytes } from "~/lib/media";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";

export default function BillingPage() {
  const { data, isLoading } = api.billing.status.useQuery();
  const checkout = api.billing.createCheckout.useMutation();
  const portal = api.billing.createPortal.useMutation();

  const redirect = async (action: () => Promise<{ url: string }>) => {
    try {
      const result = await action();
      window.location.assign(result.url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Billing could not be opened",
      );
    }
  };

  if (isLoading || !data)
    return (
      <PageContent
        header={
          <PageHeader title="Billing & Plans" description="Loading billing…" />
        }
      >
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </PageContent>
    );

  const activeSubscription = data.plan !== "free";
  return (
    <PageContent
      maxWidth="max-w-6xl"
      header={
        <PageHeader
          title="Billing & Plans"
          description="Manage this site's subscription, limits, and payment details."
          actions={
            data.subscription?.stripeCustomerId ? (
              <Button
                variant="outline"
                disabled={portal.isPending}
                onClick={() => void redirect(() => portal.mutateAsync())}
              >
                Manage in Stripe
                <ExternalLink data-icon="inline-end" />
              </Button>
            ) : undefined
          }
        />
      }
    >
      {!data.configured ? (
        <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle>Billing setup required</CardTitle>
            <CardDescription>
              Add the Stripe key, webhook secret, and plan Price IDs to enable
              paid subscriptions. Free-plan limits remain active until then.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle>Current plan: {data.planDetails.name}</CardTitle>
            <Badge variant={activeSubscription ? "default" : "secondary"}>
              {data.subscription?.status ?? "free"}
            </Badge>
          </div>
          <CardDescription>
            {formatBytes(data.planDetails.storageBytes)} storage · up to{" "}
            {data.planDetails.memberLimit} team member
            {data.planDetails.memberLimit === 1 ? "" : "s"}
            {data.subscription?.cancelAtPeriodEnd
              ? " · cancels at the end of the billing period"
              : ""}
          </CardDescription>
        </CardHeader>
        {data.subscription?.currentPeriodEnd ? (
          <CardContent className="text-sm text-muted-foreground">
            Current period ends{" "}
            {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}.
          </CardContent>
        ) : null}
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {data.plans.map((plan) => {
          const current = data.plan === plan.id;
          return (
            <Card key={plan.id} className={current ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{plan.name}</CardTitle>
                  {current ? <Badge>Current</Badge> : null}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <Check className="mt-0.5 size-4 text-primary" />
                    {formatBytes(plan.storageBytes)} media storage
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 size-4 text-primary" />
                    {plan.memberLimit} team member
                    {plan.memberLimit === 1 ? "" : "s"}
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 size-4 text-primary" />
                    {plan.customDomain
                      ? "Verified custom domain"
                      : "Workspace preview URL"}
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 size-4 text-primary" />
                    {plan.removeBranding
                      ? "White-label publishing"
                      : "hadlockCMS branding"}
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                {plan.id === "free" || current ? (
                  <Button className="w-full" variant="outline" disabled>
                    {current ? "Current plan" : "Free"}
                  </Button>
                ) : activeSubscription ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={portal.isPending}
                    onClick={() => void redirect(() => portal.mutateAsync())}
                  >
                    Change in portal
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    disabled={!data.configured || checkout.isPending}
                    onClick={() =>
                      void redirect(() =>
                        checkout.mutateAsync({ plan: plan.id }),
                      )
                    }
                  >
                    Choose {plan.name}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </PageContent>
  );
}
