"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2 } from "lucide-react";
import { api } from "~/trpc/react";
import type { Block } from "~/lib/blocks";
import {
  VisualPageBuilder,
  type DraftSaveState,
} from "~/components/admin/VisualPageBuilder";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import ImageUpload from "~/components/admin/ImageUpload";
import { toast } from "sonner";
import { WorkflowPanel } from "~/components/admin/WorkflowPanel";
import RevisionHistory from "~/components/admin/RevisionHistory";

export default function DynamicPageEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: page, refetch } = api.pages.getById.useQuery({ id });
  const saveMeta = api.pages.upsert.useMutation();
  const saveDraft = api.pages.saveDraft.useMutation();
  const publish = api.pages.publish.useMutation();
  const remove = api.pages.delete.useMutation();
  const transition = api.workflow.transition.useMutation();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [saveState, setSaveState] = useState<DraftSaveState>("saved");
  const [previewVersion, setPreviewVersion] = useState(0);
  const [meta, setMeta] = useState({
    title: "",
    slug: "",
    locale: "en-US",
    seoTitle: "",
    seoDescription: "",
    ogImage: "",
    canonical: "",
    noIndex: false,
    publishAt: "",
    unpublishAt: "",
    status: "draft" as
      | "draft"
      | "in_review"
      | "approved"
      | "scheduled"
      | "published"
      | "archived",
  });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const layoutSource = page?.draftLayout ?? page?.layout ?? "[]";
  const initialBlocks = useMemo(
    () => JSON.parse(layoutSource) as Block[],
    [layoutSource],
  );
  useEffect(() => {
    if (!page) return;
    setBlocks(JSON.parse(page.draftLayout ?? page.layout) as Block[]);
    setMeta({
      title: page.title,
      slug: page.slug,
      locale: page.locale,
      seoTitle: page.seoTitle ?? "",
      seoDescription: page.seoDescription ?? "",
      ogImage: page.ogImage ?? "",
      canonical: page.canonical ?? "",
      noIndex: page.noIndex,
      publishAt: page.publishAt
        ? new Date(page.publishAt).toISOString().slice(0, 16)
        : "",
      unpublishAt: page.unpublishAt
        ? new Date(page.unpublishAt).toISOString().slice(0, 16)
        : "",
      status: page.status,
    });
  }, [page]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );
  const flush = useCallback(
    async (next: Block[]) => {
      setSaveState("saving");
      try {
        await saveDraft.mutateAsync({ id, layout: JSON.stringify(next) });
        setSaveState("saved");
        setPreviewVersion((version) => version + 1);
      } catch (error) {
        setSaveState("error");
        throw error;
      }
    },
    [id, saveDraft],
  );
  const changeBlocks = (next: Block[]) => {
    setBlocks(next);
    setSaveState("unsaved");
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => void flush(next).catch(() => toast.error("Auto-save failed")),
      800,
    );
  };
  if (!page)
    return (
      <PageContent>
        <p className="text-sm text-muted-foreground">Loading page…</p>
      </PageContent>
    );
  const saveMetadata = async () => {
    await saveMeta.mutateAsync({
      id,
      title: meta.title,
      slug: meta.slug,
      locale: meta.locale,
      status: meta.status,
      seoTitle: meta.seoTitle || null,
      seoDescription: meta.seoDescription || null,
      ogImage: meta.ogImage || null,
      canonical: meta.canonical || null,
      noIndex: meta.noIndex,
      publishAt: meta.publishAt ? new Date(meta.publishAt) : null,
      unpublishAt: meta.unpublishAt ? new Date(meta.unpublishAt) : null,
    });
    await refetch();
    toast.success("Page settings saved");
  };
  const publishPage = async () => {
    clearTimeout(timer.current);
    await flush(blocks);
    await publish.mutateAsync({ id });
    await transition.mutateAsync({
      entityType: "dynamic_page",
      entityId: id,
      state: "published",
    });
    await refetch();
    toast.success("Page published");
  };
  const previewPath =
    meta.locale === "en-US"
      ? `/${meta.slug.replace(/^\/+/, "")}`
      : `/${meta.locale}/${meta.slug.replace(/^\/+/, "")}`;
  return (
    <PageContent
      maxWidth="max-w-full"
      header={
        <PageHeader
          title={page.title}
          description={`/${page.slug} · ${page.locale}`}
          actions={
            <>
              <Button variant="outline" onClick={() => void saveMetadata()}>
                Save settings
              </Button>
              <Button
                disabled={publish.isPending || saveState === "saving"}
                onClick={() => void publishPage()}
              >
                <Send data-icon="inline-start" />
                Publish
              </Button>
            </>
          }
        />
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <VisualPageBuilder
            documentKey={`${id}:${layoutSource}`}
            initialBlocks={initialBlocks}
            previewPath={previewPath}
            previewVersion={previewVersion}
            saveState={saveState}
            onChange={changeBlocks}
            onSaveNow={async (next) => {
              clearTimeout(timer.current);
              setBlocks(next);
              await flush(next);
              toast.success("Draft saved");
            }}
          />
        </div>
        <aside className="space-y-5">
          <WorkflowPanel entityType="dynamic_page" entityId={id} />
          <RevisionHistory
            entityType="page"
            entityId={`dynamic:${id}`}
            onRestore={async () => {
              await refetch();
            }}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Page settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={meta.title}
                  onChange={(event) =>
                    setMeta({ ...meta, title: event.target.value })
                  }
                />
              </div>
              <div>
                <Label>Path</Label>
                <Input
                  value={meta.slug}
                  onChange={(event) =>
                    setMeta({ ...meta, slug: event.target.value })
                  }
                />
              </div>
              <div>
                <Label>Locale</Label>
                <Input
                  value={meta.locale}
                  onChange={(event) =>
                    setMeta({ ...meta, locale: event.target.value })
                  }
                />
              </div>
              <div>
                <Label>Workflow</Label>
                <select
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={meta.status}
                  onChange={(event) =>
                    setMeta({
                      ...meta,
                      status: event.target.value as typeof meta.status,
                    })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="in_review">In review</option>
                  <option value="approved">Approved</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              {meta.status === "scheduled" ? (
                <div>
                  <Label>Publish at</Label>
                  <Input
                    type="datetime-local"
                    value={meta.publishAt}
                    onChange={(event) =>
                      setMeta({ ...meta, publishAt: event.target.value })
                    }
                  />
                </div>
              ) : null}
              <div>
                <Label>Expire at (optional)</Label>
                <Input
                  type="datetime-local"
                  value={meta.unpublishAt}
                  onChange={(event) =>
                    setMeta({ ...meta, unpublishAt: event.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Search title</Label>
                <Input
                  value={meta.seoTitle}
                  onChange={(event) =>
                    setMeta({ ...meta, seoTitle: event.target.value })
                  }
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={meta.seoDescription}
                  onChange={(event) =>
                    setMeta({ ...meta, seoDescription: event.target.value })
                  }
                />
              </div>
              <div>
                <Label>Social image</Label>
                <ImageUpload
                  value={meta.ogImage}
                  onChange={(ogImage) => setMeta({ ...meta, ogImage })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={meta.noIndex}
                  onChange={(event) =>
                    setMeta({ ...meta, noIndex: event.target.checked })
                  }
                />
                Hide from search engines
              </label>
            </CardContent>
          </Card>
          <Button
            variant="ghost"
            className="w-full text-destructive"
            onClick={async () => {
              if (!confirm("Delete this page permanently?")) return;
              await remove.mutateAsync({ id });
              router.push("/admin/pages");
            }}
          >
            <Trash2 data-icon="inline-start" />
            Delete page
          </Button>
        </aside>
      </div>
    </PageContent>
  );
}
