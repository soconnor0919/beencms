import Link from "next/link";
import { sanitizeRichText } from "~/lib/sanitize";
import type { Block, Bg, BlockButton } from "~/lib/blocks";
import { db } from "~/server/db";
import {
  calendarEvent,
  companies,
  customForm,
  post,
  teamMembers,
} from "~/server/db/schema";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import ContactForm from "~/components/ContactForm";
import CustomForm, { type PublicFormField } from "~/components/CustomForm";
import GalleryBlock from "~/components/GalleryBlock";
import { headers } from "next/headers";
import { resolvePublicSiteId } from "~/lib/sites";
import ResponsiveImage from "~/components/ResponsiveImage";

const BG_CLASS: Record<Bg, string> = {
  white: "bg-background",
  cream: "bg-cream dark:bg-muted",
  stone: "bg-stone dark:bg-card",
  olive: "bg-olive text-white",
};

function sectionCls(bg: Bg, extra = "px-6 py-[var(--section-spacing)]") {
  return [BG_CLASS[bg], extra].filter(Boolean).join(" ");
}

function ButtonGroup({
  buttons,
  bg,
  align = "center",
}: {
  buttons: BlockButton[];
  bg: Bg;
  align?: "left" | "center";
}) {
  if (!buttons.length) return null;
  return (
    <div
      className={`mt-8 flex flex-wrap gap-4 ${align === "center" ? "justify-center" : "justify-start"}`}
    >
      {buttons.map((btn, i) => {
        const isOliveBg = bg === "olive";
        if (btn.variant === "primary") {
          return (
            <Link
              key={i}
              href={btn.href}
              className={`rounded-[var(--button-radius)] px-8 py-3 font-medium transition-colors ${
                isOliveBg
                  ? "bg-white text-olive hover:bg-stone"
                  : "bg-olive text-white hover:bg-olive-dark"
              }`}
            >
              {btn.label}
            </Link>
          );
        }
        return (
          <Link
            key={i}
            href={btn.href}
            className={`rounded-[var(--button-radius)] border-2 px-8 py-3 font-medium transition-colors ${
              isOliveBg
                ? "border-white text-white hover:bg-white hover:text-olive"
                : "border-olive text-olive hover:bg-olive hover:text-white"
            }`}
          >
            {btn.label}
          </Link>
        );
      })}
    </div>
  );
}

function HeroBlock({ block }: { block: Extract<Block, { type: "hero" }> }) {
  const mode = block.mediaMode ?? "none";
  const align = block.align ?? "center";
  const height =
    block.height === "compact"
      ? "py-16"
      : block.height === "tall"
        ? "py-36"
        : "py-24";
  const focal = {
    center: "object-center",
    top: "object-top",
    bottom: "object-bottom",
    left: "object-left",
    right: "object-right",
  }[block.focalPoint ?? "center"];
  const copy = (
    <div
      className={`${mode === "split" ? "max-w-xl" : "mx-auto max-w-3xl"} ${align === "center" ? "text-center" : "text-left"}`}
    >
      <h1
        className={`font-serif text-5xl font-bold leading-tight md:text-6xl ${mode === "background" ? "text-white" : "text-charcoal dark:text-foreground"}`}
      >
        {block.title}
      </h1>
      {block.body ? (
        <div
          className={`mt-6 text-lg leading-relaxed prose max-w-none ${mode === "background" ? "prose-invert" : "prose-gray dark:prose-invert"}`}
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(block.body) }}
        />
      ) : null}
      <ButtonGroup
        buttons={block.buttons}
        bg={mode === "background" ? "olive" : block.bg}
        align={align}
      />
    </div>
  );

  if (mode === "background" && block.image) {
    return (
      <section className={`relative overflow-hidden px-6 ${height}`}>
        <picture className="absolute inset-0">
          {block.mobileImage ? (
            <source media="(max-width: 767px)" srcSet={block.mobileImage} />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.image}
            alt={block.imageAlt ?? ""}
            className={`h-full w-full object-cover ${focal}`}
          />
        </picture>
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: (block.overlay ?? 45) / 100 }}
        />
        <div className="relative mx-auto max-w-6xl">{copy}</div>
      </section>
    );
  }
  if (mode === "split" && block.image) {
    return (
      <section className={sectionCls(block.bg, "px-6 py-16")}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          {copy}
          <picture>
            {block.mobileImage ? (
              <source media="(max-width: 767px)" srcSet={block.mobileImage} />
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={block.image}
              alt={block.imageAlt ?? ""}
              className={`h-80 w-full rounded-2xl object-cover md:h-[30rem] ${focal}`}
            />
          </picture>
        </div>
      </section>
    );
  }
  return (
    <section className={sectionCls(block.bg, `px-6 ${height}`)}>{copy}</section>
  );
}

function RichtextBlock({
  block,
}: {
  block: Extract<Block, { type: "richtext" }>;
}) {
  return (
    <section className={sectionCls(block.bg)}>
      <div className="mx-auto max-w-3xl">
        {block.heading && (
          <h2 className="font-serif text-3xl font-bold text-charcoal dark:text-foreground">
            {block.heading}
          </h2>
        )}
        {block.body && (
          <div
            className={`leading-relaxed prose prose-gray dark:prose-invert max-w-none ${block.heading ? "mt-4" : ""}`}
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(block.body) }}
          />
        )}
      </div>
    </section>
  );
}

function TwoColBlock({ block }: { block: Extract<Block, { type: "twocol" }> }) {
  return (
    <section className={sectionCls(block.bg)}>
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          {[block.left, block.right].map((col, i) => (
            <div key={i}>
              {col.heading && (
                <h2 className="font-serif text-3xl font-bold text-charcoal dark:text-foreground">
                  {col.heading}
                </h2>
              )}
              {col.body && (
                <div
                  className="mt-4 leading-relaxed text-gray-600 dark:text-gray-400 prose prose-gray dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichText(col.body),
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBlock({ block }: { block: Extract<Block, { type: "cta" }> }) {
  return (
    <section className={sectionCls(block.bg, "px-6 py-16 text-center")}>
      <div className="mx-auto max-w-2xl">
        <h2 className="font-serif text-3xl font-bold text-charcoal dark:text-foreground">
          {block.title}
        </h2>
        {block.body && (
          <div
            className="mt-4 leading-relaxed prose prose-gray dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(block.body) }}
          />
        )}
        <ButtonGroup buttons={block.buttons} bg={block.bg} />
      </div>
    </section>
  );
}

function StatsBlock({ block }: { block: Extract<Block, { type: "stats" }> }) {
  return (
    <section className={sectionCls(block.bg, "px-6 py-16")}>
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-3">
          {block.items.map((item, i) => (
            <div key={i}>
              <div className="font-serif text-5xl font-bold">{item.stat}</div>
              <div className="mt-2 text-sm uppercase tracking-widest opacity-75">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ListBlock({ block }: { block: Extract<Block, { type: "list" }> }) {
  return (
    <section className={sectionCls(block.bg)}>
      <div className="mx-auto max-w-3xl">
        <h2 className="font-serif text-3xl font-bold text-charcoal dark:text-foreground">
          {block.heading}
        </h2>
        {block.intro && (
          <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">
            {block.intro}
          </p>
        )}
        <ul className="mt-6 space-y-3">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-olive" />
              <span className="text-gray-600 dark:text-gray-400">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CardsBlock({ block }: { block: Extract<Block, { type: "cards" }> }) {
  return (
    <section className={sectionCls(block.bg)}>
      <div className="mx-auto max-w-6xl">
        {block.heading && (
          <h2 className="font-serif text-3xl font-bold text-charcoal dark:text-foreground text-center mb-12">
            {block.heading}
          </h2>
        )}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {block.items.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-stone dark:border-border bg-background p-6"
            >
              <h3 className="font-serif text-lg font-bold text-charcoal dark:text-foreground">
                {item.title}
              </h3>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TiersBlock({ block }: { block: Extract<Block, { type: "tiers" }> }) {
  return (
    <section className={sectionCls(block.bg)}>
      <div className="mx-auto max-w-6xl">
        <h2 className="font-serif text-3xl font-bold text-charcoal dark:text-foreground text-center mb-4">
          {block.heading}
        </h2>
        {block.intro && (
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12">
            {block.intro}
          </p>
        )}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {block.items.map((tier, i) => (
            <div
              key={i}
              className={`rounded-2xl p-6 ${
                tier.highlight
                  ? "bg-olive text-white shadow-lg"
                  : "bg-background border border-stone dark:border-border"
              }`}
            >
              <div
                className={`text-sm font-semibold uppercase tracking-wider ${tier.highlight ? "text-olive-light" : "text-olive"}`}
              >
                {tier.name}
              </div>
              <div
                className={`mt-2 font-serif text-3xl font-bold ${tier.highlight ? "text-white" : "text-charcoal dark:text-foreground"}`}
              >
                {tier.amount}
              </div>
              <p
                className={`mt-3 text-sm leading-relaxed ${tier.highlight ? "text-white/80" : "text-gray-600 dark:text-gray-400"}`}
              >
                {tier.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function BlockRenderer({
  blocks,
  siteId,
}: {
  blocks: Block[];
  siteId?: string;
}) {
  return (
    <>
      {blocks.map((block) => {
        switch (block.type) {
          case "hero":
            return <HeroBlock key={block.id} block={block} />;
          case "richtext":
            return <RichtextBlock key={block.id} block={block} />;
          case "twocol":
            return <TwoColBlock key={block.id} block={block} />;
          case "cta":
            return <CtaBlock key={block.id} block={block} />;
          case "stats":
            return <StatsBlock key={block.id} block={block} />;
          case "list":
            return <ListBlock key={block.id} block={block} />;
          case "cards":
            return <CardsBlock key={block.id} block={block} />;
          case "tiers":
            return <TiersBlock key={block.id} block={block} />;
          case "image":
            return <ImageBlock key={block.id} block={block} />;
          case "gallery":
            return <GallerySection key={block.id} block={block} />;
          case "testimonials":
            return <TestimonialsBlock key={block.id} block={block} />;
          case "faq":
            return <FaqBlock key={block.id} block={block} />;
          case "logos":
            return <LogosBlock key={block.id} block={block} />;
          case "video":
            return <VideoBlock key={block.id} block={block} />;
          case "divider":
            return <DividerBlock key={block.id} block={block} />;
          case "feed":
            return <FeedBlock key={block.id} block={block} siteId={siteId} />;
          case "form":
            return <FormBlock key={block.id} block={block} siteId={siteId} />;
        }
      })}
    </>
  );
}

function GallerySection({
  block,
}: {
  block: Extract<Block, { type: "gallery" }>;
}) {
  return (
    <section className={sectionCls(block.bg)}>
      <div className="mx-auto max-w-7xl">
        {block.heading ? (
          <h2 className="text-center font-serif text-4xl font-bold">
            {block.heading}
          </h2>
        ) : null}
        {block.intro ? (
          <p className="mx-auto mt-4 max-w-3xl text-center text-muted-foreground">
            {block.intro}
          </p>
        ) : null}
        <div className={block.heading || block.intro ? "mt-10" : ""}>
          <GalleryBlock block={block} />
        </div>
      </div>
    </section>
  );
}

function TestimonialsBlock({
  block,
}: {
  block: Extract<Block, { type: "testimonials" }>;
}) {
  return (
    <section className={sectionCls(block.bg)}>
      <div className="mx-auto max-w-6xl">
        {block.heading ? (
          <h2 className="mb-10 text-center font-serif text-3xl font-bold">
            {block.heading}
          </h2>
        ) : null}
        <div className="grid gap-6 md:grid-cols-3">
          {block.items.map((item, i) => (
            <figure key={i} className="rounded-2xl border bg-background p-7">
              <blockquote className="text-lg leading-relaxed">
                “{item.quote}”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                {item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : null}
                <span>
                  <strong className="block text-sm">{item.name}</strong>
                  {item.role ? (
                    <span className="text-xs text-muted-foreground">
                      {item.role}
                    </span>
                  ) : null}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqBlock({ block }: { block: Extract<Block, { type: "faq" }> }) {
  return (
    <section className={sectionCls(block.bg)}>
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-8 font-serif text-3xl font-bold">{block.heading}</h2>
        <div className="divide-y rounded-xl border bg-background px-6">
          {block.items.map((item, i) => (
            <details key={i} className="group py-5">
              <summary className="cursor-pointer list-none font-semibold">
                {item.question}
                <span className="float-right group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function LogosBlock({ block }: { block: Extract<Block, { type: "logos" }> }) {
  return (
    <section className={sectionCls(block.bg, "px-6 py-14")}>
      <div className="mx-auto max-w-6xl">
        {block.heading ? (
          <h2 className="mb-8 text-center font-serif text-2xl font-bold">
            {block.heading}
          </h2>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-10">
          {block.items.map((item, i) => {
            const logo = (
              <img
                src={item.image}
                alt={item.name}
                className="h-16 w-36 object-contain grayscale transition hover:grayscale-0"
              />
            );
            return item.url ? (
              <a
                key={i}
                href={item.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {logo}
              </a>
            ) : (
              <div key={i}>{logo}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function VideoBlock({ block }: { block: Extract<Block, { type: "video" }> }) {
  const match = block.url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/,
  );
  const src = match
    ? `https://www.youtube-nocookie.com/embed/${match[1]}`
    : block.url.startsWith("https://player.vimeo.com/")
      ? block.url
      : null;
  if (!src) return null;
  return (
    <section className={sectionCls(block.bg)}>
      <div className="mx-auto max-w-4xl">
        {block.heading ? (
          <h2 className="mb-6 text-center font-serif text-3xl font-bold">
            {block.heading}
          </h2>
        ) : null}
        <div className="aspect-video overflow-hidden rounded-2xl">
          <iframe
            src={src}
            title={block.heading || "Video"}
            className="h-full w-full"
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
        {block.caption ? (
          <p className="mt-3 text-center text-sm text-muted-foreground">
            {block.caption}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function DividerBlock({
  block,
}: {
  block: Extract<Block, { type: "divider" }>;
}) {
  const py =
    block.spacing === "small"
      ? "py-4"
      : block.spacing === "large"
        ? "py-16"
        : "py-8";
  return (
    <div className={`${BG_CLASS[block.bg]} px-6 ${py}`}>
      <hr className="mx-auto max-w-6xl" />
    </div>
  );
}

async function FeedBlock({
  block,
  siteId: requestedSiteId,
}: {
  block: Extract<Block, { type: "feed" }>;
  siteId?: string;
}) {
  const siteId =
    requestedSiteId ?? (await resolvePublicSiteId(await headers()));
  let items: {
    title: string;
    subtitle?: string | null;
    href: string;
    image?: string | null;
  }[] = [];
  if (block.source === "team")
    items = db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.siteId, siteId))
      .orderBy(asc(teamMembers.order))
      .limit(block.limit)
      .all()
      .map((x) => ({
        title: x.name,
        subtitle: x.role,
        href: "/team",
        image: x.imageUrl,
      }));
  if (block.source === "programs")
    items = db
      .select()
      .from(companies)
      .where(and(eq(companies.siteId, siteId), eq(companies.status, "active")))
      .orderBy(asc(companies.order))
      .limit(block.limit)
      .all()
      .map((x) => ({
        title: x.name,
        subtitle: x.tagline,
        href: `/programs/${x.slug}`,
        image: x.imageUrl,
      }));
  if (block.source === "blog")
    items = db
      .select()
      .from(post)
      .where(and(eq(post.siteId, siteId), eq(post.status, "published")))
      .orderBy(desc(post.publishedAt))
      .limit(block.limit)
      .all()
      .map((x) => ({
        title: x.title,
        subtitle: x.excerpt,
        href: `/blog/${x.slug}`,
        image: x.coverImage,
      }));
  if (block.source === "events")
    items = db
      .select()
      .from(calendarEvent)
      .where(
        and(
          eq(calendarEvent.status, "published"),
          eq(calendarEvent.siteId, siteId),
          gte(calendarEvent.endAt, new Date()),
        ),
      )
      .orderBy(asc(calendarEvent.startAt))
      .limit(block.limit)
      .all()
      .map((x) => ({
        title: x.title,
        subtitle: `${x.startAt.toLocaleDateString("en-US", { dateStyle: "medium" })}${x.location ? ` · ${x.location}` : ""}`,
        href: "/events",
      }));
  return (
    <section className={sectionCls(block.bg)}>
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 text-center font-serif text-3xl font-bold">
          {block.heading}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.href + item.title}
              href={item.href}
              className="overflow-hidden rounded-xl border bg-background transition hover:shadow-md"
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt=""
                  className="h-44 w-full object-cover"
                />
              ) : null}
              <div className="p-5">
                <h3 className="font-serif text-xl font-bold">{item.title}</h3>
                {item.subtitle ? (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                    {item.subtitle}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

async function FormBlock({
  block,
  siteId: requestedSiteId,
}: {
  block: Extract<Block, { type: "form" }>;
  siteId?: string;
}) {
  const siteId =
    requestedSiteId ?? (await resolvePublicSiteId(await headers()));
  const form = block.formSlug
    ? db
        .select()
        .from(customForm)
        .where(
          and(
            eq(customForm.siteId, siteId),
            eq(customForm.slug, block.formSlug),
          ),
        )
        .get()
    : null;
  return (
    <section className={sectionCls(block.bg)}>
      <div className="mx-auto max-w-2xl">
        <h2 className="text-center font-serif text-3xl font-bold">
          {block.heading}
        </h2>
        {block.body ? (
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            {block.body}
          </p>
        ) : null}
        {form?.active ? (
          <CustomForm
            formId={form.id}
            fields={JSON.parse(form.fields) as PublicFormField[]}
            submitLabel={form.submitLabel}
            successMessage={form.successMessage}
          />
        ) : (
          <ContactForm buttonLabel={block.buttonLabel} className="mt-8" />
        )}
      </div>
    </section>
  );
}

function ImageBlock({ block }: { block: Extract<Block, { type: "image" }> }) {
  if (!block.src) return null;
  const maxW =
    block.width === "narrow"
      ? "max-w-2xl"
      : block.width === "full"
        ? "w-full"
        : "max-w-4xl";
  return (
    <section className={sectionCls(block.bg, "px-6 py-12")}>
      <div className={`mx-auto ${maxW}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <ResponsiveImage
          src={block.src}
          alt={block.alt}
          loading="lazy"
          decoding="async"
          sizes={block.width === "narrow" ? "48rem" : "100vw"}
          className="w-full rounded-lg"
        />
        {block.caption && (
          <p className="mt-3 text-center text-sm text-muted-foreground">
            {block.caption}
          </p>
        )}
      </div>
    </section>
  );
}
