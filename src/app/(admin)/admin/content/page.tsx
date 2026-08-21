"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { Globe, Loader2, Send, Trash2, PanelRightClose, PanelRightOpen, Copy } from "lucide-react";
import BlockEditor from "~/components/admin/BlockEditor";
import { AdminTabs } from "~/components/admin/AdminTabs";
import { cn } from "~/lib/utils";
import { PageHeader } from "~/components/admin/PageHeader";
import { contentPages } from "~/config/cms";
import type { Block } from "~/lib/blocks";
import RevisionHistory from "~/components/admin/RevisionHistory";

type PageDef = { page: string; label: string; href: string };

const PAGES: PageDef[] = contentPages;

type DraftStatus = "clean" | "unsaved" | "saving" | "saved";

const PREVIEW_DEFAULT_WIDTH = 520;
const PREVIEW_MIN_WIDTH = 260;
const EDITOR_MIN_WIDTH = 360;

export default function AdminContentPage() {
  const [activePage, setActivePage] = useState(PAGES[0]!.page);
  const pageDef = PAGES.find((p) => p.page === activePage)!;

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("clean");
  const [iframeKey, setIframeKey] = useState(0);

  const { data, refetch } = api.layout.getPageDraft.useQuery(
    { page: activePage },
    { refetchOnWindowFocus: false },
  );
  const saveDraftMutation = api.layout.saveDraft.useMutation();
  const publishMutation   = api.layout.publish.useMutation();
  const discardMutation   = api.layout.discard.useMutation();
  const duplicateMutation = api.layout.duplicate.useMutation();

  useEffect(() => {
    void fetch("/api/draft/enter");
    return () => { void fetch("/api/draft/exit"); };
  }, []);

  useEffect(() => {
    if (!data) return;
    setBlocks(data.draftLayout ?? data.layout);
    setDraftStatus(data.draftLayout ? "saved" : "clean");
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingBlocks = useRef<Block[]>([]);

  const flushDraft = useCallback(async (blocksToSave: Block[]) => {
    setDraftStatus("saving");
    try {
      await saveDraftMutation.mutateAsync({ page: activePage, blocks: blocksToSave });
      setDraftStatus("saved");
      setIframeKey((k) => k + 1);
    } catch {
      toast.error("Auto-save failed");
      setDraftStatus("unsaved");
    }
  }, [activePage, saveDraftMutation]);

  const handleBlocksChange = useCallback((newBlocks: Block[]) => {
    setBlocks(newBlocks);
    pendingBlocks.current = newBlocks;
    setDraftStatus("unsaved");
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => void flushDraft(pendingBlocks.current), 800);
  }, [flushDraft]);

  const [publishing, setPublishing] = useState(false);
  const handlePublish = async () => {
    clearTimeout(debounceTimer.current);
    if (draftStatus === "unsaved") await flushDraft(pendingBlocks.current);
    setPublishing(true);
    try {
      await publishMutation.mutateAsync({ page: activePage });
      await refetch();
      setDraftStatus("clean");
      toast.success(`${pageDef.label} page published`);
    } catch {
      toast.error("Publish failed — please try again");
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
      await discardMutation.mutateAsync({ page: activePage });
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

  const handlePageSwitch = (page: string) => {
    if (draftStatus === "unsaved" && !confirm("You have unsaved changes. Switch pages anyway?")) return;
    clearTimeout(debounceTimer.current);
    setActivePage(page);
  };

  // ── Preview resize / collapse ──────────────────────────────────────────────
  const [previewOpen,  setPreviewOpen]  = useState(true);
  const [previewWidth, setPreviewWidth] = useState(PREVIEW_DEFAULT_WIDTH);
  const containerRef  = useRef<HTMLDivElement>(null);
  const isDragging    = useRef(false);
  const [dragging, setDragging] = useState(false);

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    setDragging(true);

    const onMove = (mv: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = rect.right - mv.clientX;
      const maxWidth = rect.width - EDITOR_MIN_WIDTH - 4;
      setPreviewWidth(Math.max(PREVIEW_MIN_WIDTH, Math.min(maxWidth, newWidth)));
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

  const statusLabel: Record<DraftStatus, string | null> = {
    clean:   null,
    unsaved: "Unsaved changes",
    saving:  "Saving draft…",
    saved:   "Draft saved — not yet published",
  };

  const pageTabs = PAGES.map((p) => ({
    id: p.page,
    label: p.label,
    indicator: p.page === activePage && draftStatus !== "clean"
      ? <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
      : undefined,
  }));

  return (
    <div
      ref={containerRef}
      className={cn("flex h-full overflow-hidden flex-col", dragging && "select-none cursor-col-resize")}
    >
      {/* Header */}
      <div className="border-b bg-background px-8 py-5 shrink-0">
        <PageHeader
          title="Page Content"
          description="Edit blocks for each public page"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={async () => { const sourcePage = prompt(`Copy blocks from: ${PAGES.map((page) => page.page).join(", ")}`); if (!sourcePage || sourcePage === activePage || !PAGES.some((page) => page.page === sourcePage)) return; await duplicateMutation.mutateAsync({ sourcePage, targetPage: activePage }); await refetch(); toast.success("Page copied into a new draft"); }}><Copy className="mr-1.5 h-3.5 w-3.5" />Copy from…</Button>
              {draftStatus !== "clean" && (
                <Button variant="ghost" size="sm" onClick={() => void handleDiscard()} disabled={discarding || publishing} className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />Discard
                </Button>
              )}
              <Button size="sm" onClick={() => void handlePublish()} disabled={publishing || draftStatus === "clean"}>
                {publishing
                  ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Publishing…</>
                  : <><Send className="mr-1.5 h-3.5 w-3.5" />Publish</>
                }
              </Button>
            </div>
          }
        />
      </div>

      {/* Split pane */}
      <div className={cn("flex flex-1 min-h-0 overflow-hidden", dragging && "cursor-col-resize")}>

        {/* ── LEFT: Editor ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-r bg-background">

          {/* Page tab bar */}
          <AdminTabs
            tabs={pageTabs}
            active={activePage}
            onChange={handlePageSwitch}
          />

          {/* Draft status */}
          {statusLabel[draftStatus] && (
            <div className="flex items-center gap-1.5 px-4 py-2 text-xs text-muted-foreground border-b shrink-0">
              {draftStatus === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
              {statusLabel[draftStatus]}
            </div>
          )}

          {/* Block editor */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <BlockEditor blocks={blocks} onChange={handleBlocksChange} />
            <div className="mt-4"><RevisionHistory entityType="page" entityId={activePage} onRestore={async () => { await refetch(); setIframeKey((key) => key + 1); }} /></div>
          </div>
        </div>

        {/* ── Resize divider ───────────────────────────────────────────────────── */}
        {previewOpen && (
          <div
            onMouseDown={onDividerMouseDown}
            className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/40 transition-colors"
          />
        )}

        {/* ── RIGHT: Preview ───────────────────────────────────────────────────── */}
        <div
          className={cn(
            "flex flex-col overflow-hidden bg-muted/20 shrink-0",
            !dragging && "transition-[width] duration-200",
          )}
          style={{ width: previewOpen ? previewWidth : 40 }}
        >
          {/* Toolbar */}
          <div className="flex items-center gap-2 border-b bg-background px-2 py-2 shrink-0 h-[41px]">
            <button
              onClick={() => setPreviewOpen((o) => !o)}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
              aria-label={previewOpen ? "Collapse preview" : "Expand preview"}
            >
              {previewOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            </button>

            {previewOpen && (
              <>
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-mono text-xs text-muted-foreground truncate flex-1">{pageDef.href}</span>
                {draftStatus === "saved" && (
                  <Badge variant="secondary" className="text-xs shrink-0">draft</Badge>
                )}
                {draftStatus === "clean" && (
                  <Badge variant="outline" className="text-xs shrink-0">published</Badge>
                )}
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground shrink-0 px-2" onClick={() => setIframeKey((k) => k + 1)}>
                  Refresh
                </Button>
              </>
            )}
          </div>

          {previewOpen && (
            <div className="flex-1 overflow-hidden">
              <iframe
                key={iframeKey}
                src={pageDef.href}
                title={`Preview: ${pageDef.label}`}
                className="h-full w-full border-0 bg-white"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
