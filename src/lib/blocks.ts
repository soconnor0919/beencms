export type Bg = "white" | "cream" | "stone" | "olive";
export type ButtonVariant = "primary" | "outline";

export type BlockButton = {
  label: string;
  href: string;
  variant: ButtonVariant;
};

export type ImageWidth = "narrow" | "wide" | "full";

export type GalleryItem = {
  id: string;
  image: string;
  alt: string;
  title?: string;
  caption?: string;
  category?: string;
  href?: string;
  client?: string;
  role?: string;
  outcome?: string;
  technologies?: string[];
  focalX?: number;
  focalY?: number;
};

export type Block =
  | {
      id: string;
      type: "image";
      bg: Bg;
      src: string;
      alt: string;
      caption?: string;
      width?: ImageWidth;
    }
  | {
      id: string;
      type: "gallery";
      bg: Bg;
      heading?: string;
      intro?: string;
      variant: "photography" | "technical" | "projects";
      layout: "grid" | "masonry" | "featured";
      columns: 2 | 3 | 4;
      lightbox: boolean;
      items: GalleryItem[];
    }
  | {
      id: string;
      type: "hero";
      bg: Bg;
      title: string;
      body: string;
      buttons: BlockButton[];
      image?: string;
      mobileImage?: string;
      imageAlt?: string;
      mediaMode?: "none" | "background" | "split";
      focalPoint?: "center" | "top" | "bottom" | "left" | "right";
      overlay?: number;
      align?: "left" | "center";
      height?: "compact" | "medium" | "tall";
    }
  | {
      id: string;
      type: "richtext";
      bg: Bg;
      heading?: string;
      body: string;
    }
  | {
      id: string;
      type: "twocol";
      bg: Bg;
      left: { heading: string; body: string };
      right: { heading: string; body: string };
    }
  | {
      id: string;
      type: "cta";
      bg: Bg;
      title: string;
      body: string;
      buttons: BlockButton[];
    }
  | {
      id: string;
      type: "stats";
      bg: Bg;
      items: { stat: string; label: string }[];
    }
  | {
      id: string;
      type: "list";
      bg: Bg;
      heading: string;
      intro?: string;
      items: string[];
    }
  | {
      id: string;
      type: "cards";
      bg: Bg;
      heading?: string;
      items: { title: string; body: string }[];
    }
  | {
      id: string;
      type: "tiers";
      bg: Bg;
      heading: string;
      intro?: string;
      items: {
        name: string;
        amount: string;
        description: string;
        highlight?: boolean;
      }[];
    }
  | {
      id: string;
      type: "testimonials";
      bg: Bg;
      heading?: string;
      items: { quote: string; name: string; role?: string; image?: string }[];
    }
  | {
      id: string;
      type: "faq";
      bg: Bg;
      heading: string;
      items: { question: string; answer: string }[];
    }
  | {
      id: string;
      type: "logos";
      bg: Bg;
      heading?: string;
      items: { name: string; image: string; url?: string }[];
    }
  | {
      id: string;
      type: "video";
      bg: Bg;
      heading?: string;
      url: string;
      caption?: string;
    }
  | {
      id: string;
      type: "divider";
      bg: Bg;
      spacing: "small" | "medium" | "large";
    }
  | {
      id: string;
      type: "feed";
      bg: Bg;
      heading: string;
      source: "team" | "programs" | "blog" | "events";
      limit: number;
    }
  | {
      id: string;
      type: "form";
      bg: Bg;
      heading: string;
      body?: string;
      buttonLabel: string;
      formSlug?: string;
    };

export type BlockType = Block["type"];

export function duplicateBlock(
  block: Block,
  createId: () => string = () => crypto.randomUUID(),
): Block {
  const copy = structuredClone(block);
  copy.id = createId();
  if (copy.type === "gallery") {
    copy.items = copy.items.map((item) => ({ ...item, id: createId() }));
  }
  return copy;
}

export function validateBlockLayout(value: unknown): Block[] {
  if (!Array.isArray(value)) throw new Error("A page layout must be an array.");
  const knownTypes = new Set<BlockType>(
    Object.keys(BLOCK_TYPE_LABELS) as BlockType[],
  );
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object")
      throw new Error("Every page block must be an object.");
    const candidate = item as { id?: unknown; type?: unknown; bg?: unknown };
    if (typeof candidate.id !== "string" || !candidate.id)
      throw new Error("Every page block needs an ID.");
    if (ids.has(candidate.id))
      throw new Error("Page block IDs must be unique.");
    ids.add(candidate.id);
    if (
      typeof candidate.type !== "string" ||
      !knownTypes.has(candidate.type as BlockType)
    )
      throw new Error("The page contains an unsupported block type.");
    if (!BG_LABELS[candidate.bg as Bg])
      throw new Error("The page contains an unsupported block background.");
  }
  return value as Block[];
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  hero: "Hero",
  richtext: "Text",
  twocol: "Two Columns",
  cta: "Call to Action",
  stats: "Stats",
  list: "List",
  cards: "Cards",
  tiers: "Tiers",
  image: "Image",
  gallery: "Gallery / Portfolio",
  testimonials: "Testimonials",
  faq: "FAQ",
  logos: "Logo Grid",
  video: "Video",
  divider: "Divider",
  feed: "Dynamic Feed",
  form: "Contact Form",
};

export const BG_LABELS: Record<Bg, string> = {
  white: "White",
  cream: "Cream",
  stone: "Stone",
  olive: "Olive",
};

/** Sensible blank defaults when adding a new block. */
export function defaultBlock(type: BlockType, id: string): Block {
  switch (type) {
    case "hero":
      return {
        id,
        type,
        bg: "cream",
        title: "New Hero",
        body: "",
        buttons: [],
        mediaMode: "none",
        focalPoint: "center",
        overlay: 45,
        align: "center",
        height: "medium",
      };
    case "richtext":
      return { id, type, bg: "white", heading: "", body: "" };
    case "twocol":
      return {
        id,
        type,
        bg: "white",
        left: { heading: "Left Column", body: "" },
        right: { heading: "Right Column", body: "" },
      };
    case "cta":
      return {
        id,
        type,
        bg: "white",
        title: "Call to Action",
        body: "",
        buttons: [],
      };
    case "stats":
      return { id, type, bg: "olive", items: [{ stat: "", label: "" }] };
    case "list":
      return { id, type, bg: "white", heading: "List", intro: "", items: [""] };
    case "cards":
      return {
        id,
        type,
        bg: "white",
        heading: "",
        items: [{ title: "", body: "" }],
      };
    case "tiers":
      return {
        id,
        type,
        bg: "stone",
        heading: "Funding Goals",
        intro: "",
        items: [{ name: "", amount: "", description: "" }],
      };
    case "image":
      return {
        id,
        type,
        bg: "white",
        src: "",
        alt: "",
        caption: "",
        width: "wide",
      };
    case "gallery":
      return {
        id,
        type,
        bg: "white",
        heading: "Selected Work",
        intro: "",
        variant: "photography",
        layout: "masonry",
        columns: 3,
        lightbox: true,
        items: [],
      };
    case "testimonials":
      return {
        id,
        type,
        bg: "cream",
        heading: "What People Say",
        items: [{ quote: "", name: "", role: "" }],
      };
    case "faq":
      return {
        id,
        type,
        bg: "white",
        heading: "Frequently Asked Questions",
        items: [{ question: "", answer: "" }],
      };
    case "logos":
      return {
        id,
        type,
        bg: "white",
        heading: "Our Partners",
        items: [{ name: "", image: "", url: "" }],
      };
    case "video":
      return { id, type, bg: "white", heading: "", url: "", caption: "" };
    case "divider":
      return { id, type, bg: "white", spacing: "medium" };
    case "feed":
      return {
        id,
        type,
        bg: "white",
        heading: "Featured Content",
        source: "programs",
        limit: 3,
      };
    case "form":
      return {
        id,
        type,
        bg: "cream",
        heading: "Get in Touch",
        body: "",
        buttonLabel: "Send Message",
        formSlug: "",
      };
  }
}
