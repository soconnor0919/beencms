"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Trash2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Copy,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import RichTextEditor from "~/components/admin/RichTextEditor";
import ImageUpload from "~/components/admin/ImageUpload";
import type { Block, Bg, BlockType, BlockButton } from "~/lib/blocks";
import {
  BLOCK_TYPE_LABELS,
  BG_LABELS,
  defaultBlock,
  duplicateBlock,
} from "~/lib/blocks";
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

// ─── Block type metadata ───────────────────────────────────────────────────────

const BLOCK_META: Record<
  BlockType,
  {
    description: string;
    preview: React.ReactNode;
  }
> = {
  hero: {
    description:
      "Full-width banner with title, body text, and call-to-action buttons.",
    preview: (
      <div className="w-full rounded bg-amber-50 border border-amber-100 px-3 py-2.5 space-y-1">
        <div className="h-2.5 w-3/4 rounded bg-amber-300/60" />
        <div className="h-1.5 w-full rounded bg-amber-200/60" />
        <div className="h-1.5 w-2/3 rounded bg-amber-200/60" />
        <div className="flex gap-1.5 mt-1.5">
          <div className="h-4 w-12 rounded bg-amber-500/40" />
          <div className="h-4 w-12 rounded border border-amber-400/40" />
        </div>
      </div>
    ),
  },
  richtext: {
    description:
      "Optional heading with rich body text. Good for paragraphs and prose.",
    preview: (
      <div className="w-full rounded bg-white border px-3 py-2.5 space-y-1">
        <div className="h-2 w-1/2 rounded bg-gray-300/70" />
        <div className="h-1.5 w-full rounded bg-gray-200/80" />
        <div className="h-1.5 w-full rounded bg-gray-200/80" />
        <div className="h-1.5 w-3/4 rounded bg-gray-200/80" />
      </div>
    ),
  },
  twocol: {
    description:
      "Two equal columns side by side, each with a heading and body.",
    preview: (
      <div className="w-full rounded bg-white border px-3 py-2.5 grid grid-cols-2 gap-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-2 w-3/4 rounded bg-gray-300/70" />
            <div className="h-1.5 w-full rounded bg-gray-200/80" />
            <div className="h-1.5 w-5/6 rounded bg-gray-200/80" />
          </div>
        ))}
      </div>
    ),
  },
  cta: {
    description:
      "Centered call-to-action with title, supporting text, and buttons.",
    preview: (
      <div className="w-full rounded bg-white border px-3 py-2.5 flex flex-col items-center space-y-1">
        <div className="h-2.5 w-1/2 rounded bg-gray-300/70" />
        <div className="h-1.5 w-3/4 rounded bg-gray-200/80" />
        <div className="flex gap-1.5 mt-1">
          <div className="h-4 w-14 rounded bg-[#8a7d55]/40" />
        </div>
      </div>
    ),
  },
  stats: {
    description:
      "Row of big stat numbers with labels — metrics, outcomes, key figures.",
    preview: (
      <div className="w-full rounded bg-[#8a7d55]/15 border border-[#8a7d55]/20 px-3 py-2.5 flex gap-4">
        {["12", "94%", "3×"].map((s) => (
          <div key={s} className="flex flex-col items-center gap-0.5">
            <span className="text-sm font-bold text-[#8a7d55]/80">{s}</span>
            <div className="h-1 w-8 rounded bg-[#8a7d55]/30" />
          </div>
        ))}
      </div>
    ),
  },
  list: {
    description: "Heading with an optional intro and a bulleted list of items.",
    preview: (
      <div className="w-full rounded bg-white border px-3 py-2.5 space-y-1.5">
        <div className="h-2 w-1/2 rounded bg-gray-300/70" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#8a7d55]/50 shrink-0" />
            <div className="h-1.5 flex-1 rounded bg-gray-200/80" />
          </div>
        ))}
      </div>
    ),
  },
  cards: {
    description:
      "A grid of cards, each with a title and body. Great for features or team highlights.",
    preview: (
      <div className="w-full rounded bg-white border px-3 py-2.5 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded border p-1.5 space-y-1">
            <div className="h-1.5 w-full rounded bg-gray-300/70" />
            <div className="h-1 w-full rounded bg-gray-200/80" />
            <div className="h-1 w-2/3 rounded bg-gray-200/80" />
          </div>
        ))}
      </div>
    ),
  },
  tiers: {
    description:
      "Pricing or funding tiers — name, amount, description, with one highlighted.",
    preview: (
      <div className="w-full rounded bg-stone-100 border px-3 py-2.5 grid grid-cols-3 gap-2">
        {[false, true, false].map((hi, i) => (
          <div
            key={i}
            className={`rounded border p-1.5 space-y-1 ${hi ? "border-[#8a7d55]/50 bg-[#8a7d55]/10" : ""}`}
          >
            <div className="h-1.5 w-3/4 rounded bg-gray-300/70" />
            <div className="h-2 w-1/2 rounded bg-gray-400/50 font-bold" />
            <div className="h-1 w-full rounded bg-gray-200/80" />
          </div>
        ))}
      </div>
    ),
  },
  image: {
    description: "A standalone image with optional alt text and caption.",
    preview: (
      <div className="w-full rounded bg-white border px-3 py-2 flex flex-col items-center gap-1.5">
        <div className="w-full h-10 rounded bg-gray-200/80 flex items-center justify-center">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div className="h-1.5 w-1/2 rounded bg-gray-200/80" />
      </div>
    ),
  },
  gallery: {
    description:
      "Photography gallery, technical portfolio, or project case studies with filtering and optional lightbox.",
    preview: (
      <div className="grid h-16 grid-cols-3 gap-1 rounded border p-2">
        <div className="row-span-2 bg-muted" />
        <div className="bg-muted" />
        <div className="bg-muted" />
        <div className="col-span-2 bg-muted" />
      </div>
    ),
  },
  testimonials: {
    description: "Quotes with names, roles, and optional portraits.",
    preview: (
      <div className="h-16 rounded border bg-amber-50 p-3 text-xs">
        “A customer story…”
      </div>
    ),
  },
  faq: {
    description: "Accessible expandable questions and answers.",
    preview: (
      <div className="space-y-1 rounded border p-3">
        <div className="h-2 bg-gray-200" />
        <div className="h-2 bg-gray-200" />
        <div className="h-2 bg-gray-200" />
      </div>
    ),
  },
  logos: {
    description: "Linked partner or sponsor logo grid.",
    preview: (
      <div className="grid h-16 grid-cols-3 gap-2 rounded border p-3">
        <div className="bg-gray-200" />
        <div className="bg-gray-200" />
        <div className="bg-gray-200" />
      </div>
    ),
  },
  video: {
    description: "Responsive YouTube or Vimeo video.",
    preview: (
      <div className="flex h-16 items-center justify-center rounded bg-gray-900 text-white">
        ▶
      </div>
    ),
  },
  divider: {
    description: "A divider with adjustable vertical spacing.",
    preview: (
      <div className="flex h-16 items-center px-3">
        <div className="h-px w-full bg-gray-300" />
      </div>
    ),
  },
  feed: {
    description: "Automatically show team, program, story, or event cards.",
    preview: (
      <div className="grid h-16 grid-cols-3 gap-2 rounded border p-2">
        <div className="bg-gray-100" />
        <div className="bg-gray-100" />
        <div className="bg-gray-100" />
      </div>
    ),
  },
  form: {
    description: "Embedded contact form with spam protection.",
    preview: (
      <div className="space-y-1 rounded border p-2">
        <div className="h-2 bg-gray-200" />
        <div className="h-2 bg-gray-200" />
        <div className="h-4 w-16 bg-primary/30" />
      </div>
    ),
  },
};

// ─── Bg selector ──────────────────────────────────────────────────────────────

const BG_DOT_CLS: Record<Bg, string> = {
  white: "bg-white border border-gray-300",
  cream: "bg-amber-50 border border-amber-200",
  stone: "bg-stone-200 border border-stone-300",
  olive: "bg-olive",
};

function BgSelector({
  value,
  onChange,
}: {
  value: Bg;
  onChange: (bg: Bg) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Background:</span>
      {(Object.keys(BG_DOT_CLS) as Bg[]).map((bg) => (
        <button
          key={bg}
          type="button"
          title={BG_LABELS[bg]}
          onClick={() => onChange(bg)}
          className={`h-4 w-4 rounded-full transition-all ${BG_DOT_CLS[bg]} ${
            value === bg
              ? "ring-2 ring-primary ring-offset-1"
              : "hover:ring-1 hover:ring-muted-foreground"
          }`}
        />
      ))}
      <span className="text-xs text-muted-foreground">{BG_LABELS[value]}</span>
    </div>
  );
}

// ─── Preview text ─────────────────────────────────────────────────────────────

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, "").slice(0, 80);
}

function previewText(block: Block): string {
  switch (block.type) {
    case "hero":
      return block.title || "(no title)";
    case "richtext":
      return block.heading || stripHtml(block.body) || "(empty)";
    case "twocol":
      return (
        [block.left.heading, block.right.heading].filter(Boolean).join(" / ") ||
        "(empty)"
      );
    case "cta":
      return block.title || "(no title)";
    case "stats":
      return (
        block.items
          .map((i) => i.stat)
          .filter(Boolean)
          .join(" · ") || "(no stats)"
      );
    case "list":
      return block.heading || "(no heading)";
    case "cards":
      return block.heading || block.items[0]?.title || "(empty)";
    case "tiers":
      return block.heading || "(no heading)";
    case "image":
      return block.alt || block.src || "(no image)";
    case "gallery":
      return `${block.heading || "Portfolio"} · ${block.items.length} items`;
    case "testimonials":
      return block.heading || block.items[0]?.name || "(empty)";
    case "faq":
      return block.heading || "FAQ";
    case "logos":
      return block.heading || "Logo grid";
    case "video":
      return block.heading || block.url || "(no video)";
    case "divider":
      return `${block.spacing} spacing`;
    case "feed":
      return `${block.heading} · ${block.source}`;
    case "form":
      return block.heading || "Contact form";
  }
}

// ─── Button list editor ────────────────────────────────────────────────────────

function ButtonListEditor({
  buttons,
  onChange,
}: {
  buttons: BlockButton[];
  onChange: (b: BlockButton[]) => void;
}) {
  function update(i: number, patch: Partial<BlockButton>) {
    onChange(buttons.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  return (
    <div className="space-y-2">
      <Label className="text-xs">Buttons</Label>
      {buttons.map((btn, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={btn.label}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder="Label"
            className="h-7 text-xs"
          />
          <Input
            value={btn.href}
            onChange={(e) => update(i, { href: e.target.value })}
            placeholder="/href"
            className="h-7 text-xs"
          />
          <select
            value={btn.variant}
            onChange={(e) =>
              update(i, { variant: e.target.value as BlockButton["variant"] })
            }
            className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
          >
            <option value="primary">Primary</option>
            <option value="outline">Outline</option>
          </select>
          <button
            type="button"
            onClick={() => onChange(buttons.filter((_, idx) => idx !== i))}
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() =>
          onChange([...buttons, { label: "", href: "/", variant: "primary" }])
        }
      >
        <Plus className="mr-1 h-3 w-3" /> Add Button
      </Button>
    </div>
  );
}

// ─── Per-type editors ──────────────────────────────────────────────────────────

function HeroEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "hero" }>;
  onChange: (b: Extract<Block, { type: "hero" }>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Title</Label>
        <Input
          value={block.title}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Body</Label>
        <RichTextEditor
          className="mt-1"
          value={block.body}
          onChange={(html) => onChange({ ...block, body: html })}
        />
      </div>
      <ButtonListEditor
        buttons={block.buttons}
        onChange={(buttons) => onChange({ ...block, buttons })}
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Media layout</Label>
          <select
            className="mt-1 w-full rounded border bg-background p-2 text-xs"
            value={block.mediaMode ?? "none"}
            onChange={(e) =>
              onChange({
                ...block,
                mediaMode: e.target.value as NonNullable<
                  typeof block.mediaMode
                >,
              })
            }
          >
            <option value="none">No image</option>
            <option value="background">Background</option>
            <option value="split">Split</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Text alignment</Label>
          <select
            className="mt-1 w-full rounded border bg-background p-2 text-xs"
            value={block.align ?? "center"}
            onChange={(e) =>
              onChange({ ...block, align: e.target.value as "left" | "center" })
            }
          >
            <option value="center">Center</option>
            <option value="left">Left</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Height</Label>
          <select
            className="mt-1 w-full rounded border bg-background p-2 text-xs"
            value={block.height ?? "medium"}
            onChange={(e) =>
              onChange({
                ...block,
                height: e.target.value as "compact" | "medium" | "tall",
              })
            }
          >
            <option value="compact">Compact</option>
            <option value="medium">Medium</option>
            <option value="tall">Tall</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Focal point</Label>
          <select
            className="mt-1 w-full rounded border bg-background p-2 text-xs"
            value={block.focalPoint ?? "center"}
            onChange={(e) =>
              onChange({
                ...block,
                focalPoint: e.target.value as NonNullable<
                  typeof block.focalPoint
                >,
              })
            }
          >
            <option value="center">Center</option>
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
      {(block.mediaMode ?? "none") !== "none" ? (
        <>
          <div>
            <Label className="text-xs">Desktop image</Label>
            <ImageUpload
              value={block.image ?? ""}
              onChange={(image) => onChange({ ...block, image })}
            />
          </div>
          <div>
            <Label className="text-xs">Mobile image (optional)</Label>
            <ImageUpload
              value={block.mobileImage ?? ""}
              onChange={(mobileImage) => onChange({ ...block, mobileImage })}
            />
          </div>
          <div>
            <Label className="text-xs">Image alt text</Label>
            <Input
              value={block.imageAlt ?? ""}
              onChange={(e) => onChange({ ...block, imageAlt: e.target.value })}
            />
          </div>
          {block.mediaMode === "background" ? (
            <div>
              <Label className="text-xs">Overlay: {block.overlay ?? 45}%</Label>
              <input
                className="w-full"
                type="range"
                min="0"
                max="90"
                value={block.overlay ?? 45}
                onChange={(e) =>
                  onChange({ ...block, overlay: Number(e.target.value) })
                }
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function NewBlockEditor({
  block,
  onChange,
}: {
  block: Extract<
    Block,
    {
      type:
        | "testimonials"
        | "faq"
        | "logos"
        | "video"
        | "divider"
        | "feed"
        | "form";
    }
  >;
  onChange: (b: Block) => void;
}) {
  if (block.type === "video")
    return (
      <div className="space-y-3">
        <Input
          placeholder="Heading (optional)"
          value={block.heading ?? ""}
          onChange={(e) => onChange({ ...block, heading: e.target.value })}
        />
        <Input
          placeholder="YouTube or Vimeo embed URL"
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
        />
        <Input
          placeholder="Caption (optional)"
          value={block.caption ?? ""}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
        />
      </div>
    );
  if (block.type === "divider")
    return (
      <select
        className="w-full rounded border bg-background p-2 text-sm"
        value={block.spacing}
        onChange={(e) =>
          onChange({
            ...block,
            spacing: e.target.value as typeof block.spacing,
          })
        }
      >
        <option value="small">Small spacing</option>
        <option value="medium">Medium spacing</option>
        <option value="large">Large spacing</option>
      </select>
    );
  if (block.type === "feed")
    return (
      <div className="grid grid-cols-2 gap-3">
        <Input
          value={block.heading}
          onChange={(e) => onChange({ ...block, heading: e.target.value })}
        />
        <select
          className="rounded border bg-background p-2 text-sm"
          value={block.source}
          onChange={(e) =>
            onChange({
              ...block,
              source: e.target.value as typeof block.source,
            })
          }
        >
          <option value="team">Team</option>
          <option value="programs">Programs</option>
          <option value="blog">News & Articles</option>
          <option value="events">Events</option>
        </select>
        <Input
          type="number"
          min={1}
          max={12}
          value={block.limit}
          onChange={(e) =>
            onChange({ ...block, limit: Number(e.target.value) })
          }
        />
      </div>
    );
  if (block.type === "form")
    return (
      <div className="space-y-3">
        <Input
          value={block.heading}
          onChange={(e) => onChange({ ...block, heading: e.target.value })}
        />
        <Input
          placeholder="Supporting text"
          value={block.body ?? ""}
          onChange={(e) => onChange({ ...block, body: e.target.value })}
        />
        <Input
          placeholder="Custom form slug (blank uses contact form)"
          value={block.formSlug ?? ""}
          onChange={(e) => onChange({ ...block, formSlug: e.target.value })}
        />
        <Input
          placeholder="Button label"
          value={block.buttonLabel}
          onChange={(e) => onChange({ ...block, buttonLabel: e.target.value })}
        />
      </div>
    );

  if (block.type === "testimonials")
    return (
      <div className="space-y-3">
        <Input
          placeholder="Section heading"
          value={block.heading ?? ""}
          onChange={(e) => onChange({ ...block, heading: e.target.value })}
        />
        {block.items.map((item, i) => (
          <div key={i} className="space-y-2 rounded border p-3">
            <Input
              placeholder="Quote"
              value={item.quote}
              onChange={(e) =>
                onChange({
                  ...block,
                  items: block.items.map((x, n) =>
                    n === i ? { ...x, quote: e.target.value } : x,
                  ),
                })
              }
            />
            <Input
              placeholder="Name"
              value={item.name}
              onChange={(e) =>
                onChange({
                  ...block,
                  items: block.items.map((x, n) =>
                    n === i ? { ...x, name: e.target.value } : x,
                  ),
                })
              }
            />
            <Input
              placeholder="Role"
              value={item.role ?? ""}
              onChange={(e) =>
                onChange({
                  ...block,
                  items: block.items.map((x, n) =>
                    n === i ? { ...x, role: e.target.value } : x,
                  ),
                })
              }
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange({
                  ...block,
                  items: block.items.filter((_, n) => n !== i),
                })
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...block,
              items: [...block.items, { quote: "", name: "", role: "" }],
            })
          }
        >
          <Plus className="mr-1 h-3 w-3" />
          Add testimonial
        </Button>
      </div>
    );
  if (block.type === "faq")
    return (
      <div className="space-y-3">
        <Input
          placeholder="Section heading"
          value={block.heading}
          onChange={(e) => onChange({ ...block, heading: e.target.value })}
        />
        {block.items.map((item, i) => (
          <div key={i} className="space-y-2 rounded border p-3">
            <Input
              placeholder="Question"
              value={item.question}
              onChange={(e) =>
                onChange({
                  ...block,
                  items: block.items.map((x, n) =>
                    n === i ? { ...x, question: e.target.value } : x,
                  ),
                })
              }
            />
            <Input
              placeholder="Answer"
              value={item.answer}
              onChange={(e) =>
                onChange({
                  ...block,
                  items: block.items.map((x, n) =>
                    n === i ? { ...x, answer: e.target.value } : x,
                  ),
                })
              }
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange({
                  ...block,
                  items: block.items.filter((_, n) => n !== i),
                })
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...block,
              items: [...block.items, { question: "", answer: "" }],
            })
          }
        >
          <Plus className="mr-1 h-3 w-3" />
          Add question
        </Button>
      </div>
    );
  return (
    <div className="space-y-3">
      <Input
        placeholder="Section heading"
        value={block.heading ?? ""}
        onChange={(e) => onChange({ ...block, heading: e.target.value })}
      />
      {block.items.map((item, i) => (
        <div key={i} className="space-y-2 rounded border p-3">
          <Input
            placeholder="Organization name"
            value={item.name}
            onChange={(e) =>
              onChange({
                ...block,
                items: block.items.map((x, n) =>
                  n === i ? { ...x, name: e.target.value } : x,
                ),
              })
            }
          />
          <ImageUpload
            value={item.image}
            onChange={(image) =>
              onChange({
                ...block,
                items: block.items.map((x, n) =>
                  n === i ? { ...x, image } : x,
                ),
              })
            }
          />
          <Input
            placeholder="Link (optional)"
            value={item.url ?? ""}
            onChange={(e) =>
              onChange({
                ...block,
                items: block.items.map((x, n) =>
                  n === i ? { ...x, url: e.target.value } : x,
                ),
              })
            }
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                items: block.items.filter((_, n) => n !== i),
              })
            }
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({
            ...block,
            items: [...block.items, { name: "", image: "", url: "" }],
          })
        }
      >
        <Plus className="mr-1 h-3 w-3" />
        Add logo
      </Button>
    </div>
  );
}

function RichtextEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "richtext" }>;
  onChange: (b: Extract<Block, { type: "richtext" }>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Heading (optional)</Label>
        <Input
          value={block.heading ?? ""}
          onChange={(e) =>
            onChange({ ...block, heading: e.target.value || undefined })
          }
          className="mt-1"
          placeholder="Leave blank for no heading"
        />
      </div>
      <div>
        <Label className="text-xs">Body</Label>
        <RichTextEditor
          className="mt-1"
          value={block.body}
          onChange={(html) => onChange({ ...block, body: html })}
        />
      </div>
    </div>
  );
}

function TwoColEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "twocol" }>;
  onChange: (b: Extract<Block, { type: "twocol" }>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {(["left", "right"] as const).map((side) => (
        <div key={side} className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {side} column
          </p>
          <div>
            <Label className="text-xs">Heading</Label>
            <Input
              value={block[side].heading}
              onChange={(e) =>
                onChange({
                  ...block,
                  [side]: { ...block[side], heading: e.target.value },
                })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Body</Label>
            <RichTextEditor
              className="mt-1"
              value={block[side].body}
              onChange={(html) =>
                onChange({ ...block, [side]: { ...block[side], body: html } })
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CtaEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "cta" }>;
  onChange: (b: Extract<Block, { type: "cta" }>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Title</Label>
        <Input
          value={block.title}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Body</Label>
        <RichTextEditor
          className="mt-1"
          value={block.body}
          onChange={(html) => onChange({ ...block, body: html })}
        />
      </div>
      <ButtonListEditor
        buttons={block.buttons}
        onChange={(buttons) => onChange({ ...block, buttons })}
      />
    </div>
  );
}

function StatsEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "stats" }>;
  onChange: (b: Extract<Block, { type: "stats" }>) => void;
}) {
  function updateItem(
    i: number,
    patch: Partial<{ stat: string; label: string }>,
  ) {
    onChange({
      ...block,
      items: block.items.map((item, idx) =>
        idx === i ? { ...item, ...patch } : item,
      ),
    });
  }
  return (
    <div className="space-y-2">
      <Label className="text-xs">Stat items</Label>
      {block.items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={item.stat}
            onChange={(e) => updateItem(i, { stat: e.target.value })}
            placeholder="12–15"
            className="h-7 w-24 text-xs font-bold"
          />
          <Input
            value={item.label}
            onChange={(e) => updateItem(i, { label: e.target.value })}
            placeholder="months to graduation"
            className="h-7 flex-1 text-xs"
          />
          <button
            type="button"
            onClick={() =>
              onChange({
                ...block,
                items: block.items.filter((_, idx) => idx !== i),
              })
            }
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() =>
          onChange({
            ...block,
            items: [...block.items, { stat: "", label: "" }],
          })
        }
      >
        <Plus className="mr-1 h-3 w-3" /> Add stat
      </Button>
    </div>
  );
}

function ListEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "list" }>;
  onChange: (b: Extract<Block, { type: "list" }>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Heading</Label>
        <Input
          value={block.heading}
          onChange={(e) => onChange({ ...block, heading: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Intro (optional)</Label>
        <Input
          value={block.intro ?? ""}
          onChange={(e) =>
            onChange({ ...block, intro: e.target.value || undefined })
          }
          className="mt-1"
          placeholder="Leave blank to omit"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Items</Label>
        {block.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) =>
                onChange({
                  ...block,
                  items: block.items.map((x, idx) =>
                    idx === i ? e.target.value : x,
                  ),
                })
              }
              className="h-7 text-xs"
            />
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...block,
                  items: block.items.filter((_, idx) => idx !== i),
                })
              }
              className="text-muted-foreground hover:text-destructive shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onChange({ ...block, items: [...block.items, ""] })}
        >
          <Plus className="mr-1 h-3 w-3" /> Add item
        </Button>
      </div>
    </div>
  );
}

function CardsEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "cards" }>;
  onChange: (b: Extract<Block, { type: "cards" }>) => void;
}) {
  function updateItem(
    i: number,
    patch: Partial<{ title: string; body: string }>,
  ) {
    onChange({
      ...block,
      items: block.items.map((item, idx) =>
        idx === i ? { ...item, ...patch } : item,
      ),
    });
  }
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Section heading (optional)</Label>
        <Input
          value={block.heading ?? ""}
          onChange={(e) =>
            onChange({ ...block, heading: e.target.value || undefined })
          }
          className="mt-1"
          placeholder="Leave blank to omit"
        />
      </div>
      <div className="space-y-3">
        <Label className="text-xs">Cards</Label>
        {block.items.map((item, i) => (
          <div key={i} className="rounded border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Card {i + 1}
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...block,
                    items: block.items.filter((_, idx) => idx !== i),
                  })
                }
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <Input
              value={item.title}
              onChange={(e) => updateItem(i, { title: e.target.value })}
              placeholder="Card title"
              className="h-7 text-xs"
            />
            <Input
              value={item.body}
              onChange={(e) => updateItem(i, { body: e.target.value })}
              placeholder="Card body text"
              className="h-7 text-xs"
            />
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() =>
            onChange({
              ...block,
              items: [...block.items, { title: "", body: "" }],
            })
          }
        >
          <Plus className="mr-1 h-3 w-3" /> Add card
        </Button>
      </div>
    </div>
  );
}

function TiersEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "tiers" }>;
  onChange: (b: Extract<Block, { type: "tiers" }>) => void;
}) {
  function updateItem(
    i: number,
    patch: Partial<{
      name: string;
      amount: string;
      description: string;
      highlight?: boolean;
    }>,
  ) {
    onChange({
      ...block,
      items: block.items.map((item, idx) =>
        idx === i ? { ...item, ...patch } : item,
      ),
    });
  }
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Section heading</Label>
        <Input
          value={block.heading}
          onChange={(e) => onChange({ ...block, heading: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Intro (optional)</Label>
        <Input
          value={block.intro ?? ""}
          onChange={(e) =>
            onChange({ ...block, intro: e.target.value || undefined })
          }
          className="mt-1"
          placeholder="Leave blank to omit"
        />
      </div>
      <div className="space-y-3">
        <Label className="text-xs">Tiers</Label>
        {block.items.map((tier, i) => (
          <div key={i} className="rounded border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Tier {i + 1}
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...block,
                    items: block.items.filter((_, idx) => idx !== i),
                  })
                }
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex gap-2">
              <Input
                value={tier.name}
                onChange={(e) => updateItem(i, { name: e.target.value })}
                placeholder="Tier name"
                className="h-7 text-xs flex-1"
              />
              <Input
                value={tier.amount}
                onChange={(e) => updateItem(i, { amount: e.target.value })}
                placeholder="$75,000"
                className="h-7 w-28 text-xs"
              />
            </div>
            <Input
              value={tier.description}
              onChange={(e) => updateItem(i, { description: e.target.value })}
              placeholder="What this tier funds…"
              className="h-7 text-xs"
            />
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={tier.highlight ?? false}
                onChange={(e) => updateItem(i, { highlight: e.target.checked })}
                className="rounded"
              />
              Highlight (featured tier — olive background)
            </label>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() =>
            onChange({
              ...block,
              items: [
                ...block.items,
                { name: "", amount: "", description: "" },
              ],
            })
          }
        >
          <Plus className="mr-1 h-3 w-3" /> Add tier
        </Button>
      </div>
    </div>
  );
}

function ImageEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "image" }>;
  onChange: (b: Extract<Block, { type: "image" }>) => void;
}) {
  return (
    <div className="space-y-3 p-3">
      <BgSelector
        value={block.bg}
        onChange={(bg) => onChange({ ...block, bg })}
      />
      <div>
        <Label className="text-xs">Image</Label>
        <ImageUpload
          value={block.src}
          onChange={(src) => onChange({ ...block, src })}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Alt Text</Label>
        <Input
          value={block.alt}
          onChange={(e) => onChange({ ...block, alt: e.target.value })}
          className="mt-1 h-7 text-xs"
          placeholder="Describe the image"
        />
      </div>
      <div>
        <Label className="text-xs">Caption (optional)</Label>
        <Input
          value={block.caption ?? ""}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
          className="mt-1 h-7 text-xs"
        />
      </div>
      <div>
        <Label className="text-xs">Width</Label>
        <select
          value={block.width ?? "wide"}
          onChange={(e) =>
            onChange({
              ...block,
              width: e.target.value as "narrow" | "wide" | "full",
            })
          }
          className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-xs"
        >
          <option value="narrow">Narrow (max 640px)</option>
          <option value="wide">Wide (max 900px)</option>
          <option value="full">Full width</option>
        </select>
      </div>
    </div>
  );
}

function GalleryEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "gallery" }>;
  onChange: (block: Extract<Block, { type: "gallery" }>) => void;
}) {
  const updateItem = (
    index: number,
    patch: Partial<(typeof block.items)[number]>,
  ) =>
    onChange({
      ...block,
      items: block.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  const moveItem = (index: number, offset: number) => {
    const destination = index + offset;
    if (destination < 0 || destination >= block.items.length) return;
    onChange({ ...block, items: arrayMove(block.items, index, destination) });
  };
  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Portfolio type</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={block.variant}
          onValueChange={(variant) =>
            variant &&
            onChange({ ...block, variant: variant as typeof block.variant })
          }
          className="flex-wrap"
        >
          <ToggleGroupItem value="photography">Photography</ToggleGroupItem>
          <ToggleGroupItem value="technical">Technical</ToggleGroupItem>
          <ToggleGroupItem value="projects">Projects</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Heading</Label>
          <Input
            value={block.heading ?? ""}
            onChange={(event) =>
              onChange({ ...block, heading: event.target.value })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Layout</Label>
          <select
            aria-label="Gallery layout"
            value={block.layout}
            onChange={(event) =>
              onChange({
                ...block,
                layout: event.target.value as typeof block.layout,
              })
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="grid">Uniform grid</option>
            <option value="masonry">Masonry</option>
            <option value="featured">Featured first item</option>
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Introduction</Label>
        <Input
          value={block.intro ?? ""}
          onChange={(event) =>
            onChange({ ...block, intro: event.target.value })
          }
          placeholder="A short introduction to the collection"
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs">
          Columns
          <select
            aria-label="Gallery columns"
            value={block.columns}
            onChange={(event) =>
              onChange({
                ...block,
                columns: Number(event.target.value) as 2 | 3 | 4,
              })
            }
            className="rounded-md border bg-background px-2 py-1"
          >
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </label>
        {block.variant === "photography" ? (
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={block.lightbox}
              onChange={(event) =>
                onChange({ ...block, lightbox: event.target.checked })
              }
            />
            Open images in lightbox
          </label>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        {block.items.map((item, index) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-lg border p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Item {index + 1}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Move item up"
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Move item down"
                  disabled={index === block.items.length - 1}
                  onClick={() => moveItem(index, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remove item"
                  onClick={() =>
                    onChange({
                      ...block,
                      items: block.items.filter(
                        (candidate) => candidate.id !== item.id,
                      ),
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
            <ImageUpload
              value={item.image}
              onChange={(image) => updateItem(index, { image })}
              onAssetSelect={(asset) =>
                updateItem(index, {
                  image: asset.url,
                  alt: item.alt || asset.alt,
                  title: item.title || asset.title || undefined,
                  caption: item.caption || asset.caption || undefined,
                  focalX: asset.focalX,
                  focalY: asset.focalY,
                })
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Title</Label>
                <Input
                  value={item.title ?? ""}
                  onChange={(event) =>
                    updateItem(index, { title: event.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Input
                  value={item.category ?? ""}
                  onChange={(event) =>
                    updateItem(index, { category: event.target.value })
                  }
                  placeholder="Used for filters"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Alt text</Label>
              <Input
                value={item.alt}
                onChange={(event) =>
                  updateItem(index, { alt: event.target.value })
                }
                placeholder="Describe the image"
              />
            </div>
            <div>
              <Label className="text-xs">
                {block.variant === "photography" ? "Caption" : "Summary"}
              </Label>
              <Textarea
                value={item.caption ?? ""}
                onChange={(event) =>
                  updateItem(index, { caption: event.target.value })
                }
              />
            </div>
            {block.variant !== "photography" ? (
              <>
                <div>
                  <Label className="text-xs">Project URL</Label>
                  <Input
                    type="url"
                    value={item.href ?? ""}
                    onChange={(event) =>
                      updateItem(index, { href: event.target.value })
                    }
                    placeholder="https://"
                  />
                </div>
                {block.variant === "technical" ? (
                  <div>
                    <Label className="text-xs">Technologies</Label>
                    <Input
                      value={item.technologies?.join(", ") ?? ""}
                      onChange={(event) =>
                        updateItem(index, {
                          technologies: event.target.value
                            .split(",")
                            .map((value) => value.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Next.js, TypeScript, PostgreSQL"
                    />
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Client</Label>
                      <Input
                        value={item.client ?? ""}
                        onChange={(event) =>
                          updateItem(index, { client: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Role</Label>
                      <Input
                        value={item.role ?? ""}
                        onChange={(event) =>
                          updateItem(index, { role: event.target.value })
                        }
                      />
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-xs">Outcome</Label>
                  <Input
                    value={item.outcome ?? ""}
                    onChange={(event) =>
                      updateItem(index, { outcome: event.target.value })
                    }
                    placeholder="Result, impact, or measurable improvement"
                  />
                </div>
              </>
            ) : null}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onChange({
              ...block,
              items: [
                ...block.items,
                {
                  id: crypto.randomUUID(),
                  image: "",
                  alt: "",
                  title: "",
                  caption: "",
                },
              ],
            })
          }
        >
          <Plus />
          Add portfolio item
        </Button>
      </div>
    </div>
  );
}

// ─── Block row (sortable) ──────────────────────────────────────────────────────

function BlockRow({
  block,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onDuplicate,
  onMove,
}: {
  block: Block;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (b: Block) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 20 : undefined,
  };

  function renderEditor() {
    switch (block.type) {
      case "hero":
        return <HeroEditor block={block} onChange={onUpdate} />;
      case "richtext":
        return <RichtextEditor block={block} onChange={onUpdate} />;
      case "twocol":
        return <TwoColEditor block={block} onChange={onUpdate} />;
      case "cta":
        return <CtaEditor block={block} onChange={onUpdate} />;
      case "stats":
        return <StatsEditor block={block} onChange={onUpdate} />;
      case "list":
        return <ListEditor block={block} onChange={onUpdate} />;
      case "cards":
        return <CardsEditor block={block} onChange={onUpdate} />;
      case "tiers":
        return <TiersEditor block={block} onChange={onUpdate} />;
      case "image":
        return <ImageEditor block={block} onChange={onUpdate} />;
      case "gallery":
        return <GalleryEditor block={block} onChange={onUpdate} />;
      case "testimonials":
      case "faq":
      case "logos":
      case "video":
      case "divider":
      case "feed":
      case "form":
        return <NewBlockEditor block={block} onChange={onUpdate} />;
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-card overflow-hidden"
    >
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/50 select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <button
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
          onClick={(e) => e.stopPropagation()}
          aria-label="Drag to reorder block"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span
          className={`h-3.5 w-3.5 rounded-full flex-shrink-0 ${BG_DOT_CLS[block.bg]}`}
          title={`Background: ${BG_LABELS[block.bg]}`}
        />
        <Badge
          variant="outline"
          className="text-xs font-mono shrink-0 px-1.5 py-0"
        >
          {BLOCK_TYPE_LABELS[block.type]}
        </Badge>
        <span className="text-sm text-muted-foreground truncate flex-1 min-w-0">
          {previewText(block)}
        </span>

        <div
          className="flex items-center gap-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isFirst}
            onClick={() => onMove(-1)}
            aria-label="Move block up"
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isLast}
            onClick={() => onMove(1)}
            aria-label="Move block down"
          >
            <ArrowDown />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDuplicate}
            aria-label="Duplicate block"
          >
            <Copy />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              if (confirm("Delete this block?")) onDelete();
            }}
            aria-label="Delete block"
          >
            <Trash2 />
          </Button>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {open && (
        <div className="border-t px-3 py-4 space-y-4">
          <BgSelector
            value={block.bg}
            onChange={(bg) => onUpdate({ ...block, bg } as Block)}
          />
          {renderEditor()}
        </div>
      )}
    </div>
  );
}

// ─── Block picker dialog ───────────────────────────────────────────────────────

const BLOCK_TYPE_ORDER: BlockType[] = [
  "hero",
  "richtext",
  "twocol",
  "cta",
  "stats",
  "list",
  "cards",
  "tiers",
  "image",
  "gallery",
  "testimonials",
  "faq",
  "logos",
  "video",
  "divider",
  "feed",
  "form",
];

function BlockPickerDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (type: BlockType) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a Block</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 pb-2">
          {BLOCK_TYPE_ORDER.map((type) => {
            const meta = BLOCK_META[type];
            return (
              <button
                key={type}
                onClick={() => {
                  onAdd(type);
                  onClose();
                }}
                className="group flex flex-col gap-2.5 rounded-xl border border-border bg-background p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {/* Visual preview */}
                <div className="w-full overflow-hidden rounded-md border border-border/60 bg-muted/20">
                  {meta.preview}
                </div>
                {/* Name + description */}
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {BLOCK_TYPE_LABELS[type]}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                    {meta.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export default function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function update(id: string, newBlock: Block) {
    onChange(blocks.map((b) => (b.id === id ? newBlock : b)));
  }
  function remove(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }
  function duplicate(id: string) {
    const index = blocks.findIndex((block) => block.id === id);
    if (index < 0) return;
    const next = [...blocks];
    next.splice(index + 1, 0, duplicateBlock(blocks[index]!));
    onChange(next);
  }
  function move(id: string, direction: -1 | 1) {
    const index = blocks.findIndex((block) => block.id === id);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= blocks.length) return;
    onChange(arrayMove(blocks, index, destination));
  }
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    onChange(arrayMove(blocks, oldIndex, newIndex));
  }
  function addBlock(type: BlockType) {
    const id = crypto.randomUUID();
    onChange([...blocks, defaultBlock(type, id)]);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {blocks.map((block, i) => (
              <BlockRow
                key={block.id}
                block={block}
                isFirst={i === 0}
                isLast={i === blocks.length - 1}
                onUpdate={(b) => update(block.id, b)}
                onDelete={() => remove(block.id)}
                onDuplicate={() => duplicate(block.id)}
                onMove={(direction) => move(block.id, direction)}
              />
            ))}
          </div>
        </SortableContext>

        <Button
          variant="outline"
          className="w-full border-dashed text-muted-foreground hover:text-foreground mt-2"
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add Block
        </Button>
      </DndContext>

      <BlockPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={addBlock}
      />
    </>
  );
}
