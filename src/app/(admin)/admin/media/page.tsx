"use client";

import { useDeferredValue, useRef, useState } from "react";
import { FolderOpen, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, type RouterOutputs } from "~/trpc/react";
import { formatBytes } from "~/lib/media";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

type Asset = RouterOutputs["media"]["getAll"][number];
const ALL_FOLDERS = "__all";
const ROOT_FOLDER = "__root";

export default function MediaPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [folder, setFolder] = useState(ALL_FOLDERS);
  const [uploadFolder, setUploadFolder] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [draft, setDraft] = useState({
    alt: "",
    title: "",
    caption: "",
    folder: "",
    focalX: 50,
    focalY: 50,
  });
  const assets = api.media.getAll.useQuery({
    query: deferredQuery,
    folder:
      folder === ALL_FOLDERS ? null : folder === ROOT_FOLDER ? "" : folder,
  });
  const stats = api.media.stats.useQuery();
  const update = api.media.update.useMutation();
  const remove = api.media.delete.useMutation();
  const usedPercent = stats.data
    ? Math.min(100, (stats.data.usedBytes / stats.data.quotaBytes) * 100)
    : 0;

  const refresh = async () => {
    await Promise.all([assets.refetch(), stats.refetch()]);
  };
  const uploadFiles = async (files: FileList | File[]) => {
    if (!files.length) return;
    setUploading(true);
    let completed = 0;
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        form.append("folder", uploadFolder);
        const response = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok)
          throw new Error(result.error ?? `Could not upload ${file.name}`);
        completed++;
      }
      await refresh();
      toast.success(`${completed} image${completed === 1 ? "" : "s"} ready`);
    } catch (error) {
      await refresh();
      toast.error(
        `${completed} uploaded before failure: ${error instanceof Error ? error.message : "Upload failed"}`,
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  const edit = (asset: Asset) => {
    setEditing(asset);
    setDraft({
      alt: asset.alt,
      title: asset.title ?? "",
      caption: asset.caption ?? "",
      folder: asset.folder,
      focalX: asset.focalX,
      focalY: asset.focalY,
    });
  };

  return (
    <PageContent
      maxWidth="max-w-6xl"
      header={
        <PageHeader
          title="Media Library"
          description="Upload optimized images, organize folders, control focal points, and monitor site storage."
          actions={
            <Button
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload data-icon="inline-start" />
              {uploading ? "Processing…" : "Upload images"}
            </Button>
          }
        />
      }
    >
      <input
        ref={inputRef}
        type="file"
        aria-label="Upload images"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple
        className="hidden"
        onChange={(event) =>
          event.target.files && void uploadFiles(event.target.files)
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Browse assets</CardTitle>
            <CardDescription>
              Search filenames, descriptions, titles, and captions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search media…"
                aria-label="Search media"
              />
              <Select value={folder} onValueChange={setFolder}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="All folders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL_FOLDERS}>All folders</SelectItem>
                    <SelectItem value={ROOT_FOLDER}>Unfiled</SelectItem>
                    {stats.data?.folders.filter(Boolean).map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Storage</CardTitle>
            <CardDescription>
              Optimized variants count toward this site’s quota.
            </CardDescription>
            <CardAction>
              <Badge variant="secondary">
                {stats.data?.assetCount ?? 0} assets
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div
              role="progressbar"
              aria-label="Storage used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(usedPercent)}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {formatBytes(stats.data?.usedBytes ?? 0)} of{" "}
              {formatBytes(stats.data?.quotaBytes ?? 0)} used ·{" "}
              {stats.data?.variantCount ?? 0} generated files
            </p>
            <Field>
              <FieldLabel htmlFor="upload-folder">Upload folder</FieldLabel>
              <Input
                id="upload-folder"
                value={uploadFolder}
                onChange={(event) => setUploadFolder(event.target.value)}
                placeholder="Portfolio / 2026"
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {assets.data?.map((asset) => {
          const thumbnail =
            asset.variants.find((item) => item.kind === "thumbnail")?.url ??
            asset.url;
          const storedBytes = asset.variants.length
            ? asset.variants.reduce((sum, item) => sum + item.size, 0)
            : asset.size;
          return (
            <Card key={asset.id} className="overflow-hidden">
              <div
                className="flex h-52 items-center justify-center bg-muted"
                style={{ backgroundColor: asset.dominantColor ?? undefined }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnail}
                  alt={asset.alt}
                  width={asset.width ?? 320}
                  height={asset.height ?? 180}
                  loading="lazy"
                  className="h-full w-full object-contain"
                  style={{
                    objectPosition: `${asset.focalX}% ${asset.focalY}%`,
                  }}
                />
              </div>
              <CardHeader>
                <CardTitle className="truncate text-base">
                  {asset.title || asset.filename}
                </CardTitle>
                <CardDescription className="truncate">
                  {asset.folder || "Unfiled"} · {formatBytes(storedBytes)}
                </CardDescription>
                <CardAction>
                  <Badge variant={asset.alt ? "secondary" : "outline"}>
                    {asset.alt ? "Described" : "Needs alt text"}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {asset.width ?? "?"} × {asset.height ?? "?"}
                </Badge>
                <Badge variant="outline">{asset.variants.length} files</Badge>
                {asset.mimeType === "image/gif" ? (
                  <Badge variant="outline">Animated</Badge>
                ) : (
                  <Badge variant="outline">WebP + AVIF</Badge>
                )}
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => edit(asset)}>
                  <Pencil data-icon="inline-start" />
                  Edit details
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${asset.filename}`}
                  onClick={async () => {
                    if (
                      !confirm(
                        "Delete this unused image and every generated variant?",
                      )
                    )
                      return;
                    try {
                      await remove.mutateAsync({ id: asset.id });
                      await refresh();
                      toast.success("Image and variants deleted");
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Delete failed",
                      );
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      {!assets.isLoading && !assets.data?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No matching media</CardTitle>
            <CardDescription>
              Upload images or change the active search and folder filters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => inputRef.current?.click()}>
              <FolderOpen data-icon="inline-start" />
              Choose images
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit media details</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="media-alt">Alternative text</FieldLabel>
              <Textarea
                id="media-alt"
                value={draft.alt}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    alt: event.target.value,
                  }))
                }
                placeholder="Describe the image for visitors who cannot see it"
              />
              <FieldDescription>
                Leave empty only when the image is purely decorative.
              </FieldDescription>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="media-title">Title</FieldLabel>
                <Input
                  id="media-title"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="media-folder">Folder</FieldLabel>
                <Input
                  id="media-folder"
                  value={draft.folder}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      folder: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="media-caption">Caption</FieldLabel>
              <Textarea
                id="media-caption"
                value={draft.caption}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    caption: event.target.value,
                  }))
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="media-focal-x">
                  Horizontal focal point (%)
                </FieldLabel>
                <Input
                  id="media-focal-x"
                  type="number"
                  min={0}
                  max={100}
                  value={draft.focalX}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      focalX: Number(event.target.value),
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="media-focal-y">
                  Vertical focal point (%)
                </FieldLabel>
                <Input
                  id="media-focal-y"
                  type="number"
                  min={0}
                  max={100}
                  value={draft.focalY}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      focalY: Number(event.target.value),
                    }))
                  }
                />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editing || update.isPending}
              onClick={async () => {
                if (!editing) return;
                try {
                  await update.mutateAsync({ id: editing.id, ...draft });
                  await refresh();
                  setEditing(null);
                  toast.success("Media details saved");
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Save failed",
                  );
                }
              }}
            >
              {update.isPending ? "Saving…" : "Save details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
