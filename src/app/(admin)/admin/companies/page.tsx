"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/admin/PageHeader";
import { PageContent } from "~/components/admin/PageContent";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, GripVertical, Loader2, ExternalLink, FileText } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type CompanyForm = {
  id?: number;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  status: "active" | "coming_soon" | "archived";
  order: number;
};

type Company = {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  status: "active" | "coming_soon" | "archived";
  order: number;
  description: string | null;
  imageUrl: string | null;
};

const blank: CompanyForm = { name: "", slug: "", tagline: "", description: "", status: "active", order: 0 };

const STATUS_LABELS: Record<CompanyForm["status"], string> = {
  active: "Active", coming_soon: "Coming Soon", archived: "Archived",
};
const STATUS_VARIANTS: Record<CompanyForm["status"], "default" | "secondary" | "outline"> = {
  active: "default", coming_soon: "secondary", archived: "outline",
};

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3.5">
          <Skeleton className="h-4 w-4 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="flex gap-1 shrink-0">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Sortable row ─────────────────────────────────────────────────────────────

function SortableCompanyRow({
  company,
  onEdit,
  onDelete,
}: {
  company: Company;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: company.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3.5 hover:bg-muted/30 transition-colors"
    >
      <button
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">{company.name}</span>
          <Badge variant={STATUS_VARIANTS[company.status]} className="text-xs">{STATUS_LABELS[company.status]}</Badge>
          <code className="text-xs text-muted-foreground">/{company.slug}</code>
        </div>
        {company.tagline && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">{company.tagline}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/admin/companies/${company.id}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          Edit Page
        </Link>
        <a
          href={`/programs/${company.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="View on site"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8" title="Edit info">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCompaniesPage() {
  const { data: companies, refetch, isLoading } = api.companies.getAllForEditor.useQuery();
  const upsert = api.companies.upsert.useMutation({
    onSuccess: async () => {
      await refetch();
      setOpen(false);
      toast.success(form.id ? "Program updated" : "Program added");
    },
    onError: (e) => toast.error(e.message ?? "Failed to save"),
  });
  const reorder = api.companies.reorder.useMutation({
    onError: () => toast.error("Failed to save order"),
  });
  const del = api.companies.delete.useMutation({
    onSuccess: async () => {
      await refetch();
      toast.success("Program removed");
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CompanyForm>(blank);

  // Optimistic local ordering for drag-and-drop
  const [localOrder, setLocalOrder] = useState<Company[] | null>(null);
  const items: Company[] = localOrder ?? companies ?? [];

  const openNew = () => {
    setForm({ ...blank, order: companies?.length ?? 0 });
    setOpen(true);
  };
  const openEdit = (c: Company) => {
    setForm({ id: c.id, name: c.name, slug: c.slug, tagline: c.tagline ?? "", description: c.description ?? "", status: c.status, order: c.order });
    setOpen(true);
  };
  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((c) => c.id === active.id);
    const newIndex = items.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setLocalOrder(reordered);
    reorder.mutate(reordered.map((c, i) => ({ id: c.id, order: i })));
  }, [items, reorder]);

  return (
    <PageContent header={
      <PageHeader
        title="Programs"
        description="Manage the Trellis enterprises shown on the public Programs page."
        actions={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add Program</Button>}
      />
    }>

        {/* List */}
        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map((c) => (
                    <SortableCompanyRow
                      key={c.id}
                      company={c}
                      onEdit={() => openEdit(c)}
                      onDelete={() => { if (confirm(`Remove "${c.name}"?`)) del.mutate({ id: c.id }); }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {items.length === 0 && (
              <div className="rounded-lg border border-dashed py-16 text-center">
                <p className="text-sm text-muted-foreground">No programs yet. Add the first one.</p>
              </div>
            )}
          </>
        )}

        {/* Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit Program" : "Add Program"}</DialogTitle>
              <DialogDescription>This enterprise will appear on the public Programs page.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="co-name">Program Name *</Label>
                <Input
                  id="co-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || autoSlug(e.target.value) })}
                  placeholder="Trellis Auto Repair"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="co-slug">
                  URL Slug * <span className="font-normal text-muted-foreground">(auto-filled)</span>
                </Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">/programs/</span>
                  <Input
                    id="co-slug"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: autoSlug(e.target.value) })}
                    placeholder="auto-repair"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="co-tagline">Tagline <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input id="co-tagline" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Quality repairs. Meaningful work." />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="co-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Textarea id="co-desc" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe what trainees do in this enterprise…" className="resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="co-status">Status</Label>
                  <select
                    id="co-status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as CompanyForm["status"] })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  >
                    <option value="active">Active</option>
                    <option value="coming_soon">Coming Soon</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="co-order">Display Order</Label>
                  <Input id="co-order" type="number" min={0} value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => upsert.mutate(form)} disabled={upsert.isPending || !form.name || !form.slug}>
                {upsert.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save Program"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

    </PageContent>
  );
}
