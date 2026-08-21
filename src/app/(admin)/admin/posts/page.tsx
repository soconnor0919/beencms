"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/admin/PageHeader";
import { PageContent } from "~/components/admin/PageContent";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink, Loader2, Copy } from "lucide-react";

const STATUS_VARIANTS: Record<"draft" | "scheduled" | "published", "secondary" | "outline" | "default"> = {
  draft:     "secondary",
  scheduled: "outline",
  published: "default",
};

function ListSkeleton() {
  return (
    <div className="space-y-px rounded-lg border overflow-hidden">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b last:border-0">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-3 w-24" />
          <div className="flex gap-1 shrink-0">
            <Skeleton className="h-7 w-7" />
            <Skeleton className="h-7 w-7" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPostsPage() {
  const router = useRouter();
  const { data: posts, refetch, isLoading } = api.posts.getAllForEditor.useQuery();
  const upsert = api.posts.upsert.useMutation();
  const del    = api.posts.delete.useMutation({
    onSuccess: async () => {
      await refetch();
      toast.success("Post deleted");
    },
    onError: (e) => toast.error(e.message ?? "Failed to delete"),
  });
  const duplicate = api.posts.duplicate.useMutation({ onSuccess: ({ id }) => router.push(`/admin/posts/${id}`), onError: (e) => toast.error(e.message) });

  const [creating, setCreating] = useState(false);

  const handleNew = async () => {
    setCreating(true);
    try {
      const slugBase = `new-post-${Date.now()}`;
      const { id } = await upsert.mutateAsync({
        title:  "New Post",
        slug:   slugBase,
        status: "draft",
      });
      router.push(`/admin/posts/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create post");
      setCreating(false);
    }
  };

  const handleDelete = (id: number, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    del.mutate({ id });
  };

  return (
    <PageContent header={
      <PageHeader
        title="News & Articles"
        description="Publish timely news updates and longer-form articles."
        actions={
          <Button onClick={() => void handleNew()} disabled={creating}>
            {creating
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
              : <><Plus className="mr-2 h-4 w-4" />New story</>
            }
          </Button>
        }
      />
    }>

      {isLoading ? (
        <ListSkeleton />
      ) : !posts?.length ? (
        <div className="rounded-lg border border-dashed py-20 text-center">
          <p className="text-sm text-muted-foreground">No posts yet. Write your first one.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Title</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Category</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Type</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Published</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-foreground truncate max-w-[240px]">{p.title}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">/blog/{p.slug}</div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden sm:table-cell">
                    {p.category ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-5 py-3.5"><Badge variant="outline">{p.kind}</Badge></td>
                  <td className="px-5 py-3.5">
                    <Badge variant={STATUS_VARIANTS[p.status]}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground tabular-nums hidden md:table-cell">
                    {(p.publishedAt ?? p.scheduledAt)
                      ? new Date((p.publishedAt ?? p.scheduledAt)!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : <span className="text-muted-foreground/40">—</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {p.status === "published" && (
                        <a
                          href={`/blog/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="View on site"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <Link
                        href={`/admin/posts/${p.id}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button onClick={() => duplicate.mutate({ id: p.id })} className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
                      <button
                        onClick={() => handleDelete(p.id, p.title)}
                        disabled={del.isPending}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </PageContent>
  );
}
