"use client";

import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import ImageUpload from "~/components/admin/ImageUpload";
import { toast } from "sonner";

const pages = ["home", "about", "team", "programs", "blog", "events", "donate", "contact"];
export default function SeoPage() {
  const [page, setPage] = useState("home");
  const { data, refetch } = api.seo.get.useQuery({ page });
  const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [ogImage, setOgImage] = useState(""); const [canonical, setCanonical] = useState(""); const [noIndex, setNoIndex] = useState(false);
  useEffect(() => { setTitle(data?.title ?? ""); setDescription(data?.description ?? ""); setOgImage(data?.ogImage ?? ""); setCanonical(data?.canonical ?? ""); setNoIndex(data?.noIndex ?? false); }, [data, page]);
  const update = api.seo.update.useMutation({ onSuccess: async () => { toast.success("SEO settings saved"); await refetch(); }, onError: (e) => toast.error(e.message) });
  return <PageContent maxWidth="max-w-3xl" header={<PageHeader title="Page SEO" description="Control search and social metadata for every public section" />}><div className="space-y-6 rounded-xl border p-6"><div><Label>Page</Label><select className="mt-1 w-full rounded border bg-background p-2" value={page} onChange={(e) => setPage(e.target.value)}>{pages.map((value) => <option key={value} value={value}>{value[0]!.toUpperCase() + value.slice(1)}</option>)}</select></div><div><Label>Search title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /><p className="mt-1 text-xs text-muted-foreground">{title.length}/60 characters recommended</p></div><div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /><p className="mt-1 text-xs text-muted-foreground">{description.length}/160 characters recommended</p></div><div><Label>Social sharing image</Label><ImageUpload value={ogImage} onChange={setOgImage} /></div><div><Label>Canonical URL override</Label><Input type="url" value={canonical} onChange={(e) => setCanonical(e.target.value)} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={noIndex} onChange={(e) => setNoIndex(e.target.checked)} />Hide this page from search engines</label><Button onClick={() => update.mutate({ page, title: title || null, description: description || null, ogImage: ogImage || null, canonical: canonical || null, noIndex })}>Save SEO</Button></div></PageContent>;
}
