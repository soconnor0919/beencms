import type Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { env } from "~/env";
import { syncStripeSubscription } from "~/lib/billing";
import { getStripe } from "~/lib/stripe";
import { db } from "~/server/db";
import { stripeWebhookEvent } from "~/server/db/schema";

export async function POST(request: NextRequest) {
  if (!env.STRIPE_WEBHOOK_SECRET)
    return NextResponse.json(
      { error: "Stripe webhooks are not configured." },
      { status: 503 },
    );
  const signature = request.headers.get("stripe-signature");
  if (!signature)
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }
  const processed = db
    .select({ id: stripeWebhookEvent.id })
    .from(stripeWebhookEvent)
    .where(eq(stripeWebhookEvent.id, event.id))
    .get();
  if (processed) return NextResponse.json({ received: true, duplicate: true });

  try {
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.paused" ||
      event.type === "customer.subscription.resumed"
    ) {
      syncStripeSubscription(event.data.object, event.created);
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (subscriptionId) {
        const subscription =
          await getStripe().subscriptions.retrieve(subscriptionId);
        syncStripeSubscription(subscription, event.created);
      }
    }
    db.insert(stripeWebhookEvent)
      .values({ id: event.id, type: event.type })
      .run();
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(
      "Stripe webhook processing failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}
