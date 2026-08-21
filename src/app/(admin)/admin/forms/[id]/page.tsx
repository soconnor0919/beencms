"use client";

import { use } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { api } from "~/trpc/react";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

export default function FormSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const form = api.forms.getById.useQuery({ id });
  const submissions = api.forms.getSubmissions.useQuery({ formId: id });
  const update = api.forms.updateSubmission.useMutation();
  const fields = form.data ? JSON.parse(form.data.fields) as Array<{ id: string; label: string }> : [];
  return <PageContent maxWidth="max-w-6xl" header={<PageHeader title={form.data?.name ?? "Form submissions"} description={`${submissions.data?.length ?? 0} responses`} actions={<><Button variant="outline" asChild><Link href="/admin/forms">Form builder</Link></Button><Button asChild><a href={`/api/admin/forms/${id}/csv`}><Download className="mr-2 size-4" />Export CSV</a></Button></>} />}><Card><CardContent className="p-0">{submissions.data?.length ? <div className="divide-y">{submissions.data.map((submission) => { const data = JSON.parse(submission.data) as Record<string, unknown>; return <div key={submission.id} className="space-y-3 p-5"><div className="flex items-center justify-between gap-4"><time className="text-xs text-muted-foreground">{new Date(submission.createdAt).toLocaleString()}</time><select value={submission.status} className="rounded-md border bg-background p-1 text-xs" onChange={async (event) => { await update.mutateAsync({ id: submission.id, status: event.target.value as typeof submission.status }); await submissions.refetch(); }}><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="spam">Spam</option></select></div><dl className="grid gap-3 sm:grid-cols-2">{fields.map((field) => <div key={field.id}><dt className="text-xs font-semibold text-muted-foreground">{field.label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{String(data[field.id] ?? "—")}</dd></div>)}</dl></div>; })}</div> : <p className="py-16 text-center text-sm text-muted-foreground">No submissions yet.</p>}</CardContent></Card></PageContent>;
}
