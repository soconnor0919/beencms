"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "sonner";

type EntityType = "page" | "dynamic_page" | "company" | "post" | "event" | "reusable_block";
type WorkflowState = "draft" | "in_review" | "changes_requested" | "approved" | "scheduled" | "published" | "archived";

export function WorkflowPanel({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const input = { entityType, entityId };
  const workflow = api.workflow.get.useQuery(input);
  const comments = api.workflow.comments.useQuery(input);
  const transition = api.workflow.transition.useMutation();
  const lock = api.workflow.lock.useMutation();
  const unlock = api.workflow.unlock.useMutation();
  const addComment = api.workflow.addComment.useMutation();
  const resolve = api.workflow.resolveComment.useMutation();
  const [comment, setComment] = useState("");
  const state = workflow.data?.state ?? "draft";
  const changeState = async (next: WorkflowState) => { await transition.mutateAsync({ ...input, state: next }); await workflow.refetch(); toast.success(`Workflow moved to ${next.replace("_", " ")}`); };
  return <Card><CardHeader><CardTitle className="text-base">Editorial workflow</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><select className="min-w-0 flex-1 rounded-md border bg-background p-2 text-sm" value={state} onChange={(event) => void changeState(event.target.value as WorkflowState)}>{["draft", "in_review", "changes_requested", "approved", "scheduled", "published", "archived"].map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</select>{workflow.data?.lockedBy ? <Button variant="outline" onClick={async () => { await unlock.mutateAsync(input); await workflow.refetch(); }}>Unlock</Button> : <Button variant="outline" onClick={async () => { await lock.mutateAsync(input); await workflow.refetch(); }}>Lock</Button>}</div>{workflow.data?.lockedBy ? <p className="text-xs text-amber-700">Editing is locked for coordinated review.</p> : null}<div className="space-y-2"><Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Leave a review comment…" /><Button size="sm" disabled={!comment.trim()} onClick={async () => { await addComment.mutateAsync({ ...input, body: comment }); setComment(""); await comments.refetch(); }}>Add comment</Button></div><div className="space-y-2">{comments.data?.map((item) => <div key={item.id} className={item.resolvedAt ? "rounded border p-3 opacity-60" : "rounded border p-3"}><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{item.authorName ?? "Former user"}</span><Button size="sm" variant="ghost" onClick={async () => { await resolve.mutateAsync({ id: item.id, resolved: !item.resolvedAt }); await comments.refetch(); }}>{item.resolvedAt ? "Reopen" : "Resolve"}</Button></div><p className="mt-1 whitespace-pre-wrap text-sm">{item.body}</p></div>)}</div></CardContent></Card>;
}
