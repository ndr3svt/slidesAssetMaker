import { z } from "zod";
import { DeckSchema } from "@shared/deck";
import type { Branding, EditorDeck } from "@/lib/editor";

const Num = z.number().finite();

const SlideFormatSchema = z.object({
  preset: z.enum(["linkedin_portrait", "linkedin_square", "custom"]),
  width: Num,
  height: Num,
});

const TextElementSchema = z.object({
  id: z.string().min(1),
  type: z.literal("text"),
  kind: z.enum(["title", "subtitle", "body"]),
  text: z.string(),
  x: Num,
  y: Num,
  w: Num,
  h: Num,
  color: z.string(),
  fontSize: Num,
  lineHeight: Num,
  fontWeight: z.union([z.literal(400), z.literal(600), z.literal(700)]),
  align: z.enum(["left", "center"]),
  opacity: Num,
});

const ImageElementSchema = z.object({
  id: z.string().min(1),
  type: z.literal("image"),
  src: z.string().min(1),
  x: Num,
  y: Num,
  w: Num,
  h: Num,
  opacity: Num,
});

const SlideElementSchema = z.union([TextElementSchema, ImageElementSchema]);

const EditorSlideSchema = z.object({
  id: z.string().min(1),
  format: SlideFormatSchema,
  backgroundColor: z.string(),
  elements: z.array(SlideElementSchema),
});

const EditorDeckSchema = z.object({
  title: z.string(),
  slides: z.array(EditorSlideSchema).min(1),
});

const BrandingSchema = z.object({
  avatarSrc: z.string().optional(),
  name: z.string(),
  handle: z.string(),
  nameColor: z.string(),
  handleColor: z.string(),
  arrowColor: z.string(),
});

export const CarouselProjectV1Schema = z.object({
  type: z.literal("sooft_carousel"),
  version: z.literal(1),
  savedAt: z.string(),
  branding: BrandingSchema,
  deck: EditorDeckSchema,
});

export type CarouselProjectV1 = z.infer<typeof CarouselProjectV1Schema>;

export function serializeProject(deck: EditorDeck, branding: Branding): CarouselProjectV1 {
  // Keep exports lightweight; avatarSrc can be large (data URL). We'll add an opt-in later if needed.
  const { avatarSrc: _avatarSrc, ...brandingWithoutAvatar } = branding;
  return {
    type: "sooft_carousel",
    version: 1,
    savedAt: new Date().toISOString(),
    branding: brandingWithoutAvatar,
    deck,
  };
}

export function parseProjectOrLegacy(input: unknown):
  | { kind: "project"; project: CarouselProjectV1 }
  | { kind: "legacy"; deck: z.infer<typeof DeckSchema> }
  | null {
  const project = CarouselProjectV1Schema.safeParse(input);
  if (project.success) return { kind: "project", project: project.data };
  const legacy = DeckSchema.safeParse(input);
  if (legacy.success) return { kind: "legacy", deck: legacy.data };
  return null;
}
