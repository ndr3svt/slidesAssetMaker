import type { Deck as ApiDeck, Slide as ApiSlide } from "@shared/deck";

export const LINKEDIN_PORTRAIT = { width: 1080, height: 1350 } as const;
export const LINKEDIN_SQUARE = { width: 1080, height: 1080 } as const;

export type SlideFormatPreset = "linkedin_portrait" | "linkedin_square" | "custom";

export type SlideFormat = {
  preset: SlideFormatPreset;
  width: number;
  height: number;
};

export type TextKind = "title" | "subtitle" | "body";

export type TextElement = {
  id: string;
  type: "text";
  kind: TextKind;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: 400 | 600 | 700;
  align: "left" | "center";
  opacity: number;
};

export type ImageElement = {
  id: string;
  type: "image";
  src: string; // data URL
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
};

export type SlideElement = TextElement | ImageElement;

export type EditorSlide = {
  id: string;
  format: SlideFormat;
  backgroundColor: string;
  elements: SlideElement[];
};

export type EditorDeck = {
  title: string;
  slides: EditorSlide[];
};

export type Branding = {
  avatarSrc?: string; // data URL
  name: string;
  handle: string;
  nameColor: string;
  handleColor: string;
  arrowColor: string;
};

export function createId(prefix = "id") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function reorder<T>(arr: T[], from: number, to: number) {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function formatFromPreset(preset: SlideFormatPreset): SlideFormat {
  if (preset === "linkedin_square") return { preset, ...LINKEDIN_SQUARE };
  if (preset === "custom") return { preset: "custom", ...LINKEDIN_PORTRAIT };
  return { preset: "linkedin_portrait", ...LINKEDIN_PORTRAIT };
}

function defaultTextStyles(kind: TextKind) {
  if (kind === "title") {
    return {
      fontSize: 112,
      lineHeight: 1.05,
      fontWeight: 700 as const,
      color: "#7c7cff",
      w: 900,
      h: 420,
    };
  }
  if (kind === "subtitle") {
    return {
      fontSize: 54,
      lineHeight: 1.2,
      fontWeight: 600 as const,
      color: "#7c7cff",
      w: 900,
      h: 160,
    };
  }
  return {
    fontSize: 46,
    lineHeight: 1.35,
    fontWeight: 400 as const,
    color: "#c7c7d7",
    w: 900,
    h: 620,
  };
}

export function apiSlideToEditor(slide: ApiSlide, idx: number): EditorSlide {
  const id = createId("slide");
  const format = formatFromPreset("linkedin_portrait");
  const backgroundColor = "#000012";

  const title = slide.title ?? `Slide ${idx + 1}`;
  const elements: SlideElement[] = [
    {
      id: createId("el"),
      type: "text",
      kind: "title",
      text: title,
      x: 90,
      y: 160,
      align: "left",
      opacity: 1,
      ...defaultTextStyles("title"),
    },
  ];

  if (slide.subtitle) {
    elements.push({
      id: createId("el"),
      type: "text",
      kind: "subtitle",
      text: slide.subtitle,
      x: 90,
      y: 520,
      align: "left",
      opacity: 0.9,
      ...defaultTextStyles("subtitle"),
    });
  }

  if (slide.body) {
    elements.push({
      id: createId("el"),
      type: "text",
      kind: "body",
      text: slide.body,
      x: 90,
      y: slide.subtitle ? 650 : 560,
      align: "left",
      opacity: 1,
      ...defaultTextStyles("body"),
    });
  }

  return { id, format, backgroundColor, elements };
}

export function apiDeckToEditor(deck: ApiDeck): EditorDeck {
  return {
    title: deck.title,
    slides: deck.slides.map(apiSlideToEditor),
  };
}

export function defaultEditorDeck(): EditorDeck {
  const api: ApiDeck = {
    title: "Coding in 2026",
    slides: [
      {
        title: "Coding in 2026: Beyond Syntax",
        subtitle: "Why systems literacy matters more than memorizing code",
        body: "AI tools have changed programming, but real value comes from modularity, systems thinking, and intent — not just syntax.",
        bullets: null,
        footer: null,
      },
      {
        title: "Syntax is Easy to Outsource",
        subtitle: null,
        body: "Language rules aren’t the bottleneck. LLMs wire features, fix typos, and generate UI & backend code in seconds.",
        bullets: null,
        footer: null,
      },
      {
        title: "Understanding the Machine",
        subtitle: "What’s happening behind the scenes?",
        body: "When a feature “looks fine” but something’s off, you need to grasp state, flow, and what code does on every request.",
        bullets: null,
        footer: null,
      },
      {
        title: "LLMs Suggest. Humans Decide.",
        subtitle: null,
        body: "Patterns help you reason about tradeoffs, errors, and failure modes. But humans spot intent and context.",
        bullets: null,
        footer: null,
      },
    ],
  };
  return apiDeckToEditor(api);
}
