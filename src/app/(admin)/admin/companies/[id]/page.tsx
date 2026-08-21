"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Globe,
  Loader2,
  Send,
  Trash2,
  Save,
  ExternalLink,
  Info,
  FileText,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import BlockEditor from "~/components/admin/BlockEditor";
import ImageUpload from "~/components/admin/ImageUpload";
import { AdminTabs } from "~/components/admin/AdminTabs";
import { cn } from "~/lib/utils";
import type { Block } from "~/lib/blocks";
import RevisionHistory from "~/components/admin/RevisionHistory";

type DraftStatus = "clean" | "unsaved" | "saving" | "saved";
type EditorTab = "info" | "content";

const PREVIEW_DEFAULT_WIDTH = 480;
const PREVIEW_MIN_WIDTH = 260;
const EDITOR_MIN_WIDTH = 320;

export default function CompanyPageEditor() {
  const params = useParams();
  const router = useRouter();
  const companyId = Number(params.id);

  // ── Company meta ──────────────────────────────────────────────────────────────
  const { data: companies } = api.companies.getAllForEditor.useQuery();
  const company = companies?.find((c) => c.id === companyId);
  const upsertCompany = api.companies.upsert.useMutation({
    onSuccess: () => toast.success("Program info saved"),
    onError: (e) => toast.error(e.message),
  });

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [canonical, setCanonical] = useState("");
  const [noIndex, setNoIndex] = useState(false);
  const [status, setStatus] = useState<"active" | "coming_soon" | "archived">(
    "active",
  );
  const [metaDirty, setMetaDirty] = useState(false);

  useEffect(() => {
    if (!company) return;
    setName(company.name);
    setTagline(company.tagline ?? "");
    setDescription(company.description ?? "");
    setImageUrl(company.imageUrl ?? "");
    setSeoTitle(company.seoTitle ?? "");
    setSeoDescription(company.seoDescription ?? "");
    setOgImage(company.ogImage ?? "");
    setCanonical(company.canonical ?? "");
    setNoIndex(company.noIndex);
    setStatus(company.status);
    setMetaDirty(false);
  }, [company]);

  const saveInfo = async () => {
    if (!company) return;
    await upsertCompany.mutateAsync({
      id: company.id,
      name,
      slug: company.slug,
      tagline: tagline || undefined,
      description: description || undefined,
      imageUrl: imageUrl || undefined,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      ogImage: ogImage || null,
      canonical: canonical || null,
      noIndex,
      status,
      order: company.order,
    });
    setMetaDirty(false);
  };

  // ── Sub-page block content ────────────────────────────────────────────────────
  const { data: pageData, refetch } = api.companyPage.getByCompanyId.useQuery(
    { companyId },
    { enabled: !isNaN(companyId), refetchOnWindowFocus: false },
  );
  const saveDraftMutation = api.companyPage.saveDraft.useMutation();
  const saveMutation = api.companyPage.save.useMutation();
  const discardMutation = api.companyPage.discard.useMutation();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("clean");
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    if (!pageData) return;
    try {
      const draft = pageData.draftLayout
        ? (JSON.parse(pageData.draftLayout) as Block[])
        : null;
      const live = JSON.parse(pageData.layout) as Block[];
      setBlocks(draft ?? live);
      setDraftStatus(draft ? "saved" : "clean");
    } catch {
      setBlocks([]);
    }
  }, [pageData]);

  useEffect(() => {
    void fetch("/api/draft/enter");
    return () => {
      void fetch("/api/draft/exit");
    };
  }, []);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const pendingBlocks = useRef<Block[]>([]);

  const flushDraft = useCallback(
    async (blocksToSave: Block[]) => {
      setDraftStatus("saving");
      try {
        await saveDraftMutation.mutateAsync({
          companyId,
          draftLayout: JSON.stringify(blocksToSave),
        });
        setDraftStatus("saved");
        setIframeKey((k) => k + 1);
      } catch {
        toast.error("Auto-save failed");
        setDraftStatus("unsaved");
      }
    },
    [companyId, saveDraftMutation],
  );

  const handleBlocksChange = useCallback(
    (newBlocks: Block[]) => {
      setBlocks(newBlocks);
      pendingBlocks.current = newBlocks;
      setDraftStatus("unsaved");
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(
        () => void flushDraft(pendingBlocks.current),
        800,
      );
    },
    [flushDraft],
  );

  const [publishing, setPublishing] = useState(false);
  const handlePublish = async () => {
    clearTimeout(debounceTimer.current);
    if (draftStatus === "unsaved") await flushDraft(pendingBlocks.current);
    setPublishing(true);
    try {
      await saveMutation.mutateAsync({
        companyId,
        layout: JSON.stringify(blocks),
        draftLayout: null,
      });
      await refetch();
      setDraftStatus("clean");
      setIframeKey((k) => k + 1);
      toast.success("Page published");
    } catch {
      toast.error("Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const [discarding, setDiscarding] = useState(false);
  const handleDiscard = async () => {
    if (!confirm("Discard all draft changes for this page?")) return;
    clearTimeout(debounceTimer.current);
    setDiscarding(true);
    try {
      await discardMutation.mutateAsync({ companyId });
      await refetch();
      setDraftStatus("clean");
      setIframeKey((k) => k + 1);
      toast.success("Draft discarded");
    } catch {
      toast.error("Failed to discard draft");
    } finally {
      setDiscarding(false);
    }
  };

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<EditorTab>("info");
  const [previewOpen, setPreviewOpen] = useState(true);
  const [previewWidth, setPreviewWidth] = useState(PREVIEW_DEFAULT_WIDTH);

  // Resize drag handle
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [dragging, setDragging] = useState(false); // for cursor override

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    setDragging(true);

    const onMove = (mv: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = rect.right - mv.clientX;
      const maxWidth = rect.width - EDITOR_MIN_WIDTH - 4; // 4 = divider
      setPreviewWidth(
        Math.max(PREVIEW_MIN_WIDTH, Math.min(maxWidth, newWidth)),
      );
    };

    const onUp = () => {
      isDragging.current = false;
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const publicHref = company ? `/programs/${company.slug}` : "/programs";

  const draftStatusLabel: Record<DraftStatus, string | null> = {
    clean: null,
    unsaved: "Unsaved changes",
    saving: "Saving draft…",
    saved: "Draft saved · not published",
  };

  const editorTabs = [
    { id: "info" as EditorTab, label: "Info", icon: Info },
    {
      id: "content" as EditorTab,
      label: "Content",
      icon: FileText,
      indicator:
        draftStatus !== "clean" ? (
          <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
        ) : undefined,
    },
  ];

  if (!company && companies) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <p>Program not found.</p>
        <Button
          variant="outline"
          onClick={() => router.push("/admin/companies")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Programs
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full overflow-hidden",
        dragging && "select-none cursor-col-resize",
      )}
    >
      {/* ── LEFT: Editor panel — always flex-1, fills all space when preview closed ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-r bg-background">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
          <Link
            href="/admin/companies"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground truncate leading-tight">
              {company?.name ?? "Loading…"}
            </h1>
            {company && (
              <p className="text-[11px] text-muted-foreground font-mono leading-tight">
                /programs/{company.slug}
              </p>
            )}
          </div>
          <a
            href={publicHref}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            title="View live page"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Tab bar */}
        <AdminTabs
          tabs={editorTabs}
          active={activeTab}
          onChange={setActiveTab}
        />

        {/* Scrollable tab content */}
        <div className="flex-1 overflow-y-auto">
          {/* Info tab */}
          {activeTab === "info" && (
            <div className="px-5 py-5 space-y-4 max-w-xl">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setMetaDirty(true);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tagline</Label>
                <Input
                  value={tagline}
                  onChange={(e) => {
                    setTagline(e.target.value);
                    setMetaDirty(true);
                  }}
                  placeholder="Short hook for the program"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setMetaDirty(true);
                  }}
                  rows={4}
                  className="resize-none"
                  placeholder="What do trainees do here?"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cover Image</Label>
                <ImageUpload
                  value={imageUrl}
                  onChange={(v) => {
                    setImageUrl(v);
                    setMetaDirty(true);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as typeof status);
                    setMetaDirty(true);
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="active">Active</option>
                  <option value="coming_soon">Coming Soon</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="space-y-3 rounded-md border p-3">
                <p className="text-sm font-medium">Search and sharing</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">SEO title</Label>
                  <Input
                    value={seoTitle}
                    onChange={(e) => {
                      setSeoTitle(e.target.value);
                      setMetaDirty(true);
                    }}
                    placeholder={name || "Page title"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Meta description</Label>
                  <Textarea
                    value={seoDescription}
                    onChange={(e) => {
                      setSeoDescription(e.target.value);
                      setMetaDirty(true);
                    }}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Social image</Label>
                  <ImageUpload
                    value={ogImage}
                    onChange={(v) => {
                      setOgImage(v);
                      setMetaDirty(true);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Canonical URL</Label>
                  <Input
                    type="url"
                    value={canonical}
                    onChange={(e) => {
                      setCanonical(e.target.value);
                      setMetaDirty(true);
                    }}
                    placeholder="https://"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={noIndex}
                    onChange={(e) => {
                      setNoIndex(e.target.checked);
                      setMetaDirty(true);
                    }}
                  />{" "}
                  Hide from search engines
                </label>
              </div>
              <div className="pt-2 border-t">
                <Button
                  onClick={() => void saveInfo()}
                  disabled={upsertCompany.isPending || !metaDirty}
                  variant={metaDirty ? "default" : "outline"}
                  className="w-full"
                >
                  {upsertCompany.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Info
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Content tab */}
          {activeTab === "content" && (
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {draftStatus === "saving" && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {draftStatusLabel[draftStatus]}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {draftStatus !== "clean" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDiscard()}
                      disabled={discarding || publishing}
                      className="h-7 text-xs text-destructive hover:text-destructive px-2"
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Discard
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => void handlePublish()}
                    disabled={publishing || draftStatus === "clean"}
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        Publishing…
                      </>
                    ) : (
                      <>
                        <Send className="mr-1.5 h-3 w-3" />
                        Publish
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <BlockEditor blocks={blocks} onChange={handleBlocksChange} />
              <RevisionHistory
                entityType="company"
                entityId={String(companyId)}
                onRestore={async () => {
                  await refetch();
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Resize divider — only shown when preview is open ─────────────────────── */}
      {previewOpen && (
        <div
          onMouseDown={onDividerMouseDown}
          className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/40 transition-colors"
          title="Drag to resize"
        />
      )}

      {/* ── RIGHT: Preview panel — explicit pixel width, collapses to icon strip ── */}
      <div
        className={cn(
          "flex flex-col overflow-hidden bg-muted/20 shrink-0",
          !dragging && "transition-[width] duration-200",
        )}
        style={{ width: previewOpen ? previewWidth : 40 }}
      >
        {/* Preview toolbar */}
        <div className="flex items-center gap-2 border-b bg-background px-2 py-2 shrink-0 h-[41px]">
          <button
            onClick={() => setPreviewOpen((o) => !o)}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            aria-label={previewOpen ? "Collapse preview" : "Expand preview"}
          >
            {previewOpen ? (
              <PanelRightClose size={15} />
            ) : (
              <PanelRightOpen size={15} />
            )}
          </button>

          {previewOpen && (
            <>
              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-mono text-xs text-muted-foreground truncate flex-1">
                {publicHref}
              </span>
              {draftStatus === "saved" && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  draft
                </Badge>
              )}
              {draftStatus === "clean" && (
                <Badge variant="outline" className="text-xs shrink-0">
                  published
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground shrink-0 px-2"
                onClick={() => setIframeKey((k) => k + 1)}
              >
                Refresh
              </Button>
            </>
          )}
        </div>

        {/* iframe */}
        {previewOpen &&
          (company ? (
            <iframe
              key={iframeKey}
              src={publicHref}
              className="flex-1 w-full border-0 bg-background"
              title="Page preview"
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
              Loading…
            </div>
          ))}
      </div>
    </div>
  );
}
