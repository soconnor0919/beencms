"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Github } from "lucide-react";
import type { Block, GalleryItem } from "~/lib/blocks";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import ResponsiveImage from "~/components/ResponsiveImage";

type Gallery = Extract<Block, { type: "gallery" }>;

function PortfolioCard({
  item,
  variant,
}: {
  item: GalleryItem;
  variant: Gallery["variant"];
}) {
  const content = (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border bg-background shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {item.image ? (
        <ResponsiveImage
          src={item.image}
          alt={item.alt}
          loading="lazy"
          decoding="async"
          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
          focalX={item.focalX}
          focalY={item.focalY}
          className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            {item.category ? (
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {item.category}
              </p>
            ) : null}
            <h3 className="font-serif text-xl font-bold">
              {item.title || "Untitled project"}
            </h3>
          </div>
          {item.href ? (
            variant === "technical" && item.href.includes("github.com") ? (
              <Github aria-hidden="true" className="size-4 shrink-0" />
            ) : (
              <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
            )
          ) : null}
        </div>
        {item.caption ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {item.caption}
          </p>
        ) : null}
        {variant === "projects" && (item.client || item.role) ? (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Client</dt>
              <dd>{item.client || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Role</dt>
              <dd>{item.role || "—"}</dd>
            </div>
          </dl>
        ) : null}
        {item.outcome ? (
          <p className="mt-auto border-l-2 border-primary pl-3 text-sm">
            <span className="font-medium">Outcome:</span> {item.outcome}
          </p>
        ) : null}
        {item.technologies?.length ? (
          <div className="mt-auto flex flex-wrap gap-1.5">
            {item.technologies.map((technology) => (
              <Badge key={technology} variant="secondary">
                {technology}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
  return item.href ? (
    <a
      href={item.href}
      target={item.href.startsWith("http") ? "_blank" : undefined}
      rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
      className="block h-full"
    >
      {content}
    </a>
  ) : (
    content
  );
}

export default function GalleryBlock({ block }: { block: Gallery }) {
  const [category, setCategory] = useState("all");
  const [active, setActive] = useState<GalleryItem | null>(null);
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          block.items
            .map((item) => item.category)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [block.items],
  );
  const items =
    category === "all"
      ? block.items
      : block.items.filter((item) => item.category === category);
  const columns =
    block.columns === 2
      ? "md:grid-cols-2"
      : block.columns === 4
        ? "md:grid-cols-2 xl:grid-cols-4"
        : "md:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="flex flex-col gap-8">
      {categories.length > 1 ? (
        <ToggleGroup
          type="single"
          variant="outline"
          value={category}
          onValueChange={(value) => value && setCategory(value)}
          className="flex-wrap"
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          {categories.map((item) => (
            <ToggleGroupItem key={item} value={item}>
              {item}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : null}
      {block.variant === "photography" ? (
        <div
          className={cn(
            block.layout === "masonry"
              ? "columns-1 gap-4 sm:columns-2 lg:columns-3"
              : `grid gap-4 ${columns}`,
          )}
        >
          {items.map((item, index) => (
            <figure
              key={item.id}
              className={cn(
                "group relative overflow-hidden rounded-lg bg-muted",
                block.layout === "masonry" && "mb-4 break-inside-avoid",
                block.layout === "featured" &&
                  index === 0 &&
                  "md:col-span-2 md:row-span-2",
              )}
            >
              <button
                type="button"
                className="block w-full cursor-zoom-in text-left"
                onClick={() => block.lightbox && setActive(item)}
                disabled={!block.lightbox}
                aria-label={
                  block.lightbox ? `Open ${item.title || item.alt}` : undefined
                }
              >
                <ResponsiveImage
                  src={item.image}
                  alt={item.alt}
                  loading="lazy"
                  decoding="async"
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  focalX={item.focalX}
                  focalY={item.focalY}
                  className={cn(
                    "w-full object-cover transition duration-500 group-hover:scale-[1.02]",
                    block.layout === "grid" && "aspect-square",
                    block.layout === "featured" &&
                      (index === 0 ? "aspect-[4/3] h-full" : "aspect-square"),
                  )}
                />
                {item.title || item.caption ? (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 pt-12 text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                    <strong className="block">{item.title}</strong>
                    {item.caption ? (
                      <span className="mt-1 block text-sm text-white/80">
                        {item.caption}
                      </span>
                    ) : null}
                  </figcaption>
                ) : null}
              </button>
            </figure>
          ))}
        </div>
      ) : (
        <div className={`grid gap-6 ${columns}`}>
          {items.map((item) => (
            <PortfolioCard key={item.id} item={item} variant={block.variant} />
          ))}
        </div>
      )}
      <Dialog
        open={Boolean(active)}
        onOpenChange={(open) => !open && setActive(null)}
      >
        <DialogContent
          className="max-h-[92vh] max-w-6xl overflow-y-auto bg-black p-2 text-white sm:max-w-6xl"
          showCloseButton
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              {active?.title || active?.alt || "Gallery image"}
            </DialogTitle>
            <DialogDescription>
              {active?.caption || "Expanded gallery image"}
            </DialogDescription>
          </DialogHeader>
          {active ? (
            <figure>
              <ResponsiveImage
                src={active.image}
                alt={active.alt}
                sizes="100vw"
                focalX={active.focalX}
                focalY={active.focalY}
                className="max-h-[82vh] w-full object-contain"
              />
              {active.title || active.caption ? (
                <figcaption className="p-4">
                  <strong>{active.title}</strong>
                  {active.caption ? (
                    <p className="mt-1 text-sm text-white/70">
                      {active.caption}
                    </p>
                  ) : null}
                </figcaption>
              ) : null}
            </figure>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
