"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays, Copy, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

type FormState = { id?: number; title: string; description: string; location: string; url: string; startAt: string; endAt: string; allDay: boolean; status: "draft" | "published" };
const localValue = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const emptyForm = (): FormState => { const start = new Date(); start.setMinutes(0, 0, 0); start.setHours(start.getHours() + 1); const end = new Date(start.getTime() + 3_600_000); return { title: "", description: "", location: "", url: "", startAt: localValue(start), endAt: localValue(end), allDay: false, status: "draft" }; };

export default function CalendarEditorPage() {
  const { data: events = [], refetch, isLoading } = api.calendar.getAllForEditor.useQuery();
  const [form, setForm] = useState<FormState>(emptyForm);
  const formRef = useRef(form);
  const replaceForm = (next: FormState) => { formRef.current = next; setForm(next); };
  const updateForm = (patch: Partial<FormState>) => { const next = { ...formRef.current, ...patch }; formRef.current = next; setForm(next); };
  const save = api.calendar.upsert.useMutation({ onSuccess: async ({ id }) => { await refetch(); updateForm({ id }); toast.success("Event saved"); }, onError: (error) => toast.error(error.message) });
  const remove = api.calendar.delete.useMutation({ onSuccess: async () => { await refetch(); replaceForm(emptyForm()); toast.success("Event deleted"); }, onError: (error) => toast.error(error.message) });
  const monthDays = useMemo(() => { const anchor = new Date(); const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1); const start = new Date(first); start.setDate(1 - first.getDay()); return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; }); }, []);
  const selectEvent = (event: (typeof events)[number]) => replaceForm({ id: event.id, title: event.title, description: event.description ?? "", location: event.location ?? "", url: event.url ?? "", startAt: localValue(event.startAt), endAt: localValue(event.endAt), allDay: event.allDay, status: event.status });
  const submit = () => { const current = formRef.current; save.mutate({ ...current, description: current.description || undefined, location: current.location || undefined, url: current.url || undefined, startAt: new Date(current.startAt), endAt: new Date(current.endAt) }); };
  const copyFeed = async () => { await navigator.clipboard.writeText(`${window.location.origin}/calendar.ics`); toast.success("Calendar feed link copied"); };
  const today = new Date();
  return <PageContent header={<PageHeader title="Calendar" description="Create events and publish a calendar feed visitors can subscribe to." actions={<div className="flex gap-2"><Button variant="outline" onClick={() => void copyFeed()}><Copy className="mr-2 h-4 w-4" />Copy feed link</Button><Button onClick={() => replaceForm(emptyForm())}><Plus className="mr-2 h-4 w-4" />New event</Button></div>} />}>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">{today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2></div>
        <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-medium text-muted-foreground">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="p-2">{day}</div>)}</div>
        <div className="grid grid-cols-7">{monthDays.map((day) => { const dayEvents = events.filter((event) => event.startAt.toDateString() === day.toDateString()); const muted = day.getMonth() !== today.getMonth(); return <div key={day.toISOString()} className={cn("min-h-24 border-b border-r p-1.5", muted && "bg-muted/20 text-muted-foreground")}><span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", day.toDateString() === today.toDateString() && "bg-primary text-primary-foreground")}>{day.getDate()}</span><div className="mt-1 space-y-1">{dayEvents.map((event) => <button key={event.id} onClick={() => selectEvent(event)} className={cn("block w-full truncate rounded px-1.5 py-1 text-left text-[11px]", event.status === "published" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>{event.title}</button>)}</div></div>; })}</div>
      </section>
      <section className="h-fit rounded-xl border bg-card p-5">
        <div className="mb-5 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h2 className="font-semibold">{form.id ? "Edit event" : "New event"}</h2></div>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Title</Label><Input aria-label="Event title" value={form.title} onChange={(e) => updateForm({ title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>Starts</Label><Input aria-label="Event starts" type="datetime-local" value={form.startAt} onChange={(e) => updateForm({ startAt: e.target.value })} /></div><div className="space-y-1.5"><Label>Ends</Label><Input aria-label="Event ends" type="datetime-local" value={form.endAt} onChange={(e) => updateForm({ endAt: e.target.value })} /></div></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allDay} onChange={(e) => updateForm({ allDay: e.target.checked })} />All-day event</label>
          <div className="space-y-1.5"><Label>Location</Label><Input aria-label="Event location" value={form.location} onChange={(e) => updateForm({ location: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Event link</Label><Input aria-label="Event link" type="url" placeholder="https://" value={form.url} onChange={(e) => updateForm({ url: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea aria-label="Event description" rows={4} value={form.description} onChange={(e) => updateForm({ description: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Status</Label><select aria-label="Event status" value={form.status} onChange={(e) => updateForm({ status: e.target.value as FormState["status"] })} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="draft">Draft</option><option value="published">Published</option></select></div>
          <div className="flex gap-2"><Button className="flex-1" disabled={!form.title || save.isPending} onClick={submit}>{save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save event</Button>{form.id ? <Button variant="destructive" size="icon" aria-label="Delete event" disabled={remove.isPending} onClick={() => { if (confirm(`Delete “${form.title}”?`)) remove.mutate({ id: form.id! }); }}><Trash2 className="h-4 w-4" /></Button> : null}</div>
        </div>
      </section>
    </div>
    {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading events…</p> : null}
  </PageContent>;
}
