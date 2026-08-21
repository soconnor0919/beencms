import type { Block } from "~/lib/blocks";
import type { LayoutPresetId } from "~/config/themes";

const button = (label: string, href: string) => ({
  label,
  href,
  variant: "primary" as const,
});

export function getStarterBlocks(
  layout: LayoutPresetId,
  siteName: string,
): Block[] {
  const hero: Block = {
    id: "starter-hero",
    type: "hero",
    bg: "cream",
    title: siteName,
    body: "<p>Introduce what you create, who you help, and why your work matters.</p>",
    buttons: [button("Explore the work", "/work")],
    mediaMode: "none",
    align: layout === "editorial" ? "center" : "left",
    height: layout === "photography" ? "tall" : "medium",
  };
  if (layout === "photography")
    return [
      hero,
      {
        id: "starter-gallery",
        type: "gallery",
        bg: "white",
        heading: "Selected photographs",
        intro:
          "Upload images, organize collections, and let every frame breathe.",
        variant: "photography",
        layout: "masonry",
        columns: 3,
        lightbox: true,
        items: [],
      },
      {
        id: "starter-cta",
        type: "cta",
        bg: "stone",
        title: "Plan a session",
        body: "Tell visitors how to inquire about commissions, licensing, or availability.",
        buttons: [button("Get in touch", "/contact")],
      },
    ];
  if (layout === "technical")
    return [
      hero,
      {
        id: "starter-technical",
        type: "gallery",
        bg: "white",
        heading: "Systems and technical work",
        intro:
          "Document the problem, architecture, technologies, and measurable result.",
        variant: "technical",
        layout: "grid",
        columns: 2,
        lightbox: false,
        items: [],
      },
      {
        id: "starter-capabilities",
        type: "cards",
        bg: "stone",
        heading: "Capabilities",
        items: [
          { title: "Engineering", body: "Describe the systems you build." },
          {
            title: "Technical leadership",
            body: "Explain how you guide delivery.",
          },
          { title: "Results", body: "Add concrete outcomes and evidence." },
        ],
      },
    ];
  if (layout === "projects")
    return [
      hero,
      {
        id: "starter-projects",
        type: "gallery",
        bg: "white",
        heading: "Selected projects",
        intro:
          "Turn each item into a concise case study with your role, process, and outcome.",
        variant: "projects",
        layout: "featured",
        columns: 2,
        lightbox: true,
        items: [],
      },
      {
        id: "starter-process",
        type: "twocol",
        bg: "stone",
        left: {
          heading: "Approach",
          body: "<p>Explain how you move from discovery to delivery.</p>",
        },
        right: {
          heading: "Collaboration",
          body: "<p>Set expectations for clients and project partners.</p>",
        },
      },
    ];
  if (layout === "editorial")
    return [
      hero,
      {
        id: "starter-intro",
        type: "richtext",
        bg: "white",
        heading: "A clear point of view",
        body: "<p>Use this space for an editor’s note, an introduction, or the central idea behind your publication.</p>",
      },
      {
        id: "starter-feed",
        type: "feed",
        bg: "stone",
        heading: "Latest stories",
        source: "blog",
        limit: 6,
      },
    ];
  return [
    hero,
    {
      id: "starter-services",
      type: "cards",
      bg: "white",
      heading: "What we do",
      items: [
        { title: "Primary service", body: "Explain the first way you help." },
        {
          title: "Specialized work",
          body: "Highlight a differentiating capability.",
        },
        {
          title: "Ongoing support",
          body: "Describe the next step for visitors.",
        },
      ],
    },
    {
      id: "starter-cta",
      type: "cta",
      bg: "olive",
      title: "Ready to begin?",
      body: "Give visitors one clear next action.",
      buttons: [button("Contact us", "/contact")],
    },
  ];
}
