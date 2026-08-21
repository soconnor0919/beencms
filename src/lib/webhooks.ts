import "server-only";
import { createHmac, randomUUID } from "crypto";
import { db } from "~/server/db";
import { webhookDelivery, webhookEndpoint } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export async function emitWebhook(
  siteId: string,
  event: string,
  data: unknown,
) {
  const endpoints = db
    .select()
    .from(webhookEndpoint)
    .where(eq(webhookEndpoint.siteId, siteId))
    .all()
    .filter(
      (endpoint) =>
        endpoint.active &&
        (JSON.parse(endpoint.events) as string[]).includes(event),
    );
  await Promise.all(
    endpoints.map(async (endpoint) => {
      const payload = JSON.stringify({
        id: randomUUID(),
        event,
        createdAt: new Date().toISOString(),
        data,
      });
      const signature = createHmac("sha256", endpoint.secret)
        .update(payload)
        .digest("hex");
      try {
        const response = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-hadlockcms-signature": signature,
          },
          body: payload,
          signal: AbortSignal.timeout(10_000),
        });
        await db
          .insert(webhookDelivery)
          .values({
            endpointId: endpoint.id,
            event,
            responseCode: response.status,
            success: response.ok,
          });
      } catch (error) {
        await db
          .insert(webhookDelivery)
          .values({
            endpointId: endpoint.id,
            event,
            success: false,
            error: error instanceof Error ? error.message : "Delivery failed",
          });
      }
    }),
  );
}
