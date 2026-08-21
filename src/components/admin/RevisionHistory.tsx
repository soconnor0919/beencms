"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";

export default function RevisionHistory({ entityType, entityId, onRestore }: { entityType: "page" | "company" | "post"; entityId: string; onRestore: () => void | Promise<void> }) {
  const { data } = api.revisions.getAll.useQuery({ entityType, entityId });
  const restore = api.revisions.restore.useMutation({ onSuccess: async () => { toast.success("Revision restored as a draft"); await onRestore(); }, onError: (e) => toast.error(e.message) });
  if (!data?.length) return null;
  return <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Revision history ({data.length})</summary><div className="mt-3 space-y-2">{data.map((revision) => <div key={revision.id} className="flex items-center justify-between gap-3 text-xs"><span>{new Date(revision.createdAt).toLocaleString()} · {revision.createdEmail ?? "Unknown editor"}</span><Button variant="outline" size="sm" onClick={() => restore.mutate({ id: revision.id })}>Restore as draft</Button></div>)}</div></details>;
}
