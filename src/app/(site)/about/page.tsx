import { draftMode } from "next/headers";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { headers } from "next/headers";
import BlockRenderer from "~/components/BlockRenderer";
import { getPageMetadata } from "~/lib/metadata";

export const generateMetadata = () => getPageMetadata("about", "/about", "About");

export default async function AboutPage() {
  const ctx = await createTRPCContext({ headers: await headers() });
  const caller = createCaller(ctx);
  const [{ layout }, { isEnabled: isDraft }] = await Promise.all([
    caller.layout.getPage({ page: "about" }),
    draftMode(),
  ]);
  let blocks = layout;
  if (isDraft) {
    try {
      const preview = await caller.layout.getPageDraft({ page: "about" });
      blocks = preview.draftLayout ?? preview.layout;
    } catch {
      // A stale draft cookie without an editor session falls back to published content.
    }
  }
  return <BlockRenderer blocks={blocks} />;
}
