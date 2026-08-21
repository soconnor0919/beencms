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

function autoSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function PostEditor() {
  const params = useParams();
  const router = useRouter();
  const postId = Number(params.id);

  // ── Post metadata ─────────────────────────────────────────────────────────────
  const { data: post, refetch: refetchPost } = api.posts.getById.useQuery(
    { id: postId },
    { enabled: !isNaN(postId) },
  );
  const upsertPost = api.posts.upsert.useMutation({
    onSuccess: async () => {
      await refetchPost();
      toast.success("Post info saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [category, setCategory] = useState("");
  const [kind, setKind] = useState<"news" | "article">("article");
  const [byline, setByline] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [canonical, setCanonical] = useState("");
  const [noIndex, setNoIndex] = useState(false);
  const [status, setStatus] = useState<"draft" | "scheduled" | "published">(
    "draft",
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [metaDirty, setMetaDirty] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (!post) return;
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt ?? "");
    setCoverImage(post.coverImage ?? "");
    setCategory(post.category ?? "");
    setKind(post.kind);
    setByline(post.byline ?? "");
    setSourceUrl(post.sourceUrl ?? "");
    setSeoTitle(post.seoTitle ?? "");
    setSeoDescription(post.seoDescription ?? "");
    setOgImage(post.ogImage ?? "");
    setCanonical(post.canonical ?? "");
    setNoIndex(post.noIndex);
    setStatus(post.status);
    setScheduledAt(
      post.scheduledAt
        ? new Date(post.scheduledAt).toISOString().slice(0, 16)
        : "",
    );
    setMetaDirty(false);
    setSlugEdited(true); // treat loaded slug as already set
  }, [post]);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!slugEdited) setSlug(autoSlug(v));
    setMetaDirty(true);
  };

  const saveInfo = async () => {
    await upsertPost.mutateAsync({
      id: postId,
      title,
      slug,
      excerpt: excerpt || undefined,
      coverImage: coverImage || undefined,
      category: category || undefined,
      kind,
      byline: byline || undefined,
      sourceUrl: sourceUrl || undefined,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      ogImage: ogImage || null,
      canonical: canonical || null,
      noIndex,
      status,
      scheduledAt:
        status === "scheduled" && scheduledAt ? new Date(scheduledAt) : null,
    });
    setMetaDirty(false);
  };

  // ── Block content ─────────────────────────────────────────────────────────────
  const saveDraftMutation = api.posts.saveDraft.useMutation();
  const publishMutation = api.posts.publish.useMutation();
  const discardMutation = api.posts.discard.useMutation();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("clean");
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    if (!post) return;
    try {
      const draft = post.draftLayout
        ? (JSON.parse(post.draftLayout) as Block[])
        : null;
      const live = JSON.parse(post.layout) as Block[];
      setBlocks(draft ?? live);
      setDraftStatus(draft ? "saved" : "clean");
    } catch {
      setBlocks([]);
    }
  }, [post]);

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
          id: postId,
          draftLayout: JSON.stringify(blocksToSave),
        });
        setDraftStatus("saved");
        setIframeKey((k) => k + 1);
      } catch {
        toast.error("Auto-save failed");
        setDraftStatus("unsaved");
      }
    },
    [postId, saveDraftMutation],
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
      await publishMutation.mutateAsync({ id: postId });
      await refetchPost();
      setDraftStatus("clean");
      setIframeKey((k) => k + 1);
      toast.success("Post published");
    } catch {
      toast.error("Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const [discarding, setDiscarding] = useState(false);
  const handleDiscard = async () => {
    if (!confirm("Discard all draft changes for this post?")) return;
    clearTimeout(debounceTimer.current);
    setDiscarding(true);
    try {
      await discardMutation.mutateAsync({ id: postId });
      await refetchPost();
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

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
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

  const publicHref = post ? `/blog/${post.slug}` : "/blog";
  const copyPreviewLink = async () => {
    if (!post) return;
    const response = await fetch(
      `/api/preview-link?slug=${encodeURIComponent(post.slug)}`,
    );
    const data = (await response.json()) as { url?: string };
    if (data.url) {
      await navigator.clipboard.writeText(data.url);
      toast.success("24-hour preview link copied");
    }
  };

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

  if (!post && !isNaN(postId)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <p>Post not found.</p>
        <Button variant="outline" onClick={() => router.push("/admin/posts")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to News & Articles
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
      {/* ── LEFT: Editor panel ─────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-r bg-background">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
          <Link
            href="/admin/posts"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground truncate leading-tight">
              {post?.title ?? "Loading…"}
            </h1>
            {post && (
              <p className="text-[11px] text-muted-foreground font-mono leading-tight">
                /blog/{post.slug}
              </p>
            )}
          </div>
          {post?.status === "published" && (
            <a
              href={publicHref}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              title="View live post"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {post ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void copyPreviewLink()}
            >
              Copy preview link
            </Button>
          ) : null}
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
                <Label className="text-xs">Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Post title"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Slug *</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground shrink-0">
                    /blog/
                  </span>
                  <Input
                    value={slug}
                    onChange={(e) => {
                      setSlug(autoSlug(e.target.value));
                      setSlugEdited(true);
                      setMetaDirty(true);
                    }}
                    className="font-mono"
                    placeholder="my-post-title"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Excerpt{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  value={excerpt}
                  onChange={(e) => {
                    setExcerpt(e.target.value);
                    setMetaDirty(true);
                  }}
                  rows={3}
                  className="resize-none"
                  placeholder="Short summary shown on the blog listing page"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Cover Image{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <ImageUpload
                  value={coverImage}
                  onChange={(v) => {
                    setCoverImage(v);
                    setMetaDirty(true);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Content type</Label>
                  <select
                    aria-label="Content type"
                    value={kind}
                    onChange={(e) => {
                      setKind(e.target.value as typeof kind);
                      setMetaDirty(true);
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  >
                    <option value="article">Article</option>
                    <option value="news">News</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Category{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setMetaDirty(true);
                    }}
                    placeholder="e.g. News, Stories"
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
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Byline{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    value={byline}
                    onChange={(e) => {
                      setByline(e.target.value);
                      setMetaDirty(true);
                    }}
                    placeholder="Staff or author name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Source URL{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => {
                      setSourceUrl(e.target.value);
                      setMetaDirty(true);
                    }}
                    placeholder="https://"
                  />
                </div>
              </div>
              {status === "scheduled" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Publish date and time</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => {
                      setScheduledAt(e.target.value);
                      setMetaDirty(true);
                    }}
                  />
                </div>
              )}
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
                    placeholder={title || "Page title"}
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
                  disabled={
                    upsertPost.isPending || !metaDirty || !title || !slug
                  }
                  variant={metaDirty ? "default" : "outline"}
                  className="w-full"
                >
                  {upsertPost.isPending ? (
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
                entityType="post"
                entityId={String(postId)}
                onRestore={async () => {
                  await refetchPost();
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Resize divider ───────────────────────────────────────────────────────── */}
      {previewOpen && (
        <div
          onMouseDown={onDividerMouseDown}
          className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/40 transition-colors"
          title="Drag to resize"
        />
      )}

      {/* ── RIGHT: Preview panel ─────────────────────────────────────────────────── */}
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
              {draftStatus === "clean" && post?.status === "published" && (
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
          (post ? (
            <iframe
              key={iframeKey}
              src={publicHref}
              className="flex-1 w-full border-0 bg-background"
              title="Post preview"
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
