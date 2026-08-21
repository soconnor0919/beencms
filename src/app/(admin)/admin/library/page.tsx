"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import type { Block } from "~/lib/blocks";
import BlockEditor from "~/components/admin/BlockEditor";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const search = api.library.search.useQuery(
    { query, limit: 20 },
    { enabled: query.trim().length >= 2 },
  );
  const reusable = api.library.reusable.useQuery();
  const terms = api.library.terms.useQuery();
  const saveBlock = api.library.saveReusable.useMutation();
  const saveTerm = api.library.saveTerm.useMutation();
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockName, setBlockName] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [term, setTerm] = useState({
    name: "",
    slug: "",
    type: "tag" as "tag" | "category",
  });
  return (
    <PageContent
      maxWidth="max-w-6xl"
      header={
        <PageHeader
          title="Content Library"
          description="Search all content, maintain taxonomies, and save reusable sections."
          actions={
            <Button onClick={() => setBlockOpen(true)}>
              New reusable section
            </Button>
          }
        />
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Global search</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages, posts, programs, and people…"
          />
          {query.length >= 2 ? (
            <div className="mt-4 divide-y rounded-lg border">
              {search.data?.length ? (
                search.data.map((result) => (
                  <a
                    key={`${result.type}-${result.id}`}
                    href={result.href}
                    target="_blank"
                    className="block px-4 py-3 hover:bg-muted"
                  >
                    <p className="text-sm font-medium">{result.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.type} · {result.href}
                    </p>
                  </a>
                ))
              ) : (
                <p className="p-4 text-sm text-muted-foreground">No matches.</p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reusable sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reusable.data?.length ? (
              reusable.data.map((item) => (
                <button
                  key={item.id}
                  className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setBlockName(item.name);
                    setBlocks(JSON.parse(item.content) as Block[]);
                    setBlockOpen(true);
                  }}
                >
                  <span>{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.category ?? "General"}
                  </span>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Save frequently reused page sections here.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categories and tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <select
                className="rounded-md border bg-background px-2 text-sm"
                value={term.type}
                onChange={(event) =>
                  setTerm({
                    ...term,
                    type: event.target.value as typeof term.type,
                  })
                }
              >
                <option value="tag">Tag</option>
                <option value="category">Category</option>
              </select>
              <Input
                value={term.name}
                onChange={(event) =>
                  setTerm({
                    ...term,
                    name: event.target.value,
                    slug: event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, ""),
                  })
                }
                placeholder="Name"
              />
              <Button
                disabled={!term.name || !term.slug}
                onClick={async () => {
                  await saveTerm.mutateAsync(term);
                  setTerm({ name: "", slug: "", type: "tag" });
                  await terms.refetch();
                }}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {terms.data?.map((item) => (
                <span
                  key={item.id}
                  className="rounded-full border px-3 py-1 text-xs"
                >
                  {item.name} · {item.type}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reusable section</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={blockName}
                onChange={(event) => setBlockName(event.target.value)}
              />
            </div>
            <BlockEditor blocks={blocks} onChange={setBlocks} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!blockName || blocks.length === 0}
              onClick={async () => {
                await saveBlock.mutateAsync({
                  name: blockName,
                  content: JSON.stringify(blocks),
                });
                await reusable.refetch();
                setBlockOpen(false);
                setBlockName("");
                setBlocks([]);
                toast.success("Reusable section saved");
              }}
            >
              Save section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
