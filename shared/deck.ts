import { z } from "zod";

export const GenerateRequestSchema = z.object({
  prompt: z.string().min(1).max(20000),
  slideCount: z.number().int().min(4).max(10).default(5),
  audience: z.string().max(200).optional(),
  tone: z.string().max(200).optional(),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const SlideSchema = z.object({
  title: z.string().min(1).max(90),
  // Note: for OpenAI structured outputs with `strict: true`, all object properties must be required.
  // Optional fields are represented as `null`.
  subtitle: z.string().max(140).nullable(),
  body: z.string().max(520).nullable(),
  bullets: z.array(z.string().min(1).max(90)).max(8).nullable(),
  footer: z.string().max(80).nullable(),
});

export type Slide = z.infer<typeof SlideSchema>;

export const DeckSchema = z.object({
  title: z.string().min(1).max(120),
  slides: z.array(SlideSchema).min(4).max(10),
});

export type Deck = z.infer<typeof DeckSchema>;
