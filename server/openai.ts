import { DeckSchema, type GenerateRequest } from "../shared/deck";

type ResponsesApiResult = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
  choices?: Array<{ message?: { content?: string } }>;
};

function extractOutputText(result: ResponsesApiResult): string | null {
  if (typeof result.output_text === "string") return result.output_text;
  if (Array.isArray(result.output)) {
    for (const item of result.output) {
      for (const chunk of item.content ?? []) {
        if (typeof chunk?.text === "string") return chunk.text;
      }
    }
  }
  const legacy = result.choices?.[0]?.message?.content;
  return typeof legacy === "string" ? legacy : null;
}

export async function generateDeck({
  apiKey,
  model,
  prd,
  request,
}: {
  apiKey: string;
  model: string;
  prd: string;
  request: GenerateRequest;
}) {
  const system = [
    "You generate a LinkedIn carousel deck as JSON.",
    "Return concise, punchy copy that fits a 1080x1350 (4:5) slide.",
    "Avoid markdown; keep lines short; no hashtags unless asked.",
    "Ensure each slide is coherent and the deck flows.",
    "",
    "JSON rules:",
    "- Output must match the provided JSON Schema exactly.",
    "- Every slide must include: title, subtitle, body, bullets, footer.",
    "- If a field has no content, set it to null (not an empty string).",
    "- Titles are short; subtitle/body/bullets/footer can be null.",
    "",
    prd ? `App context (PRD):\n${prd}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // Bun doesn't provide zod -> json schema by default; define schema explicitly.
  const jsonSchema = {
    type: "json_schema",
    name: "deck",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        slides: {
          type: "array",
          minItems: 4,
          maxItems: 10,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              subtitle: { type: ["string", "null"] },
              body: { type: ["string", "null"] },
              bullets: { type: ["array", "null"], items: { type: "string" }, maxItems: 8 },
              footer: { type: ["string", "null"] },
            },
            required: ["title", "subtitle", "body", "bullets", "footer"],
          },
        },
      },
      required: ["title", "slides"],
    },
  } as const;

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                prompt: request.prompt,
                slideCount: request.slideCount,
                audience: request.audience,
                tone: request.tone,
              }),
            },
          ],
        },
      ],
      text: { format: jsonSchema },
    }),
  });

  if (!resp.ok) {
    const ct = resp.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const data = (await resp.json().catch(() => null)) as any;
      const msg =
        typeof data?.error?.message === "string"
          ? data.error.message
          : typeof data?.message === "string"
            ? data.message
            : null;
      throw new Error(`OpenAI error (${resp.status}): ${(msg ?? "Request failed").slice(0, 240)}`);
    }
    const text = await resp.text().catch(() => "");
    const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    throw new Error(`OpenAI error (${resp.status}): ${clean.slice(0, 240)}`);
  }

  const data = (await resp.json()) as ResponsesApiResult;
  const out = extractOutputText(data);
  if (!out) throw new Error("OpenAI response missing output text.");

  const parsed = DeckSchema.safeParse(JSON.parse(out));
  if (!parsed.success) {
    throw new Error(`Invalid deck JSON: ${parsed.error.message}`);
  }

  const deck = parsed.data;
  if (deck.slides.length !== request.slideCount) {
    // Keep UI predictable; trim/pad if the model deviates.
    deck.slides = deck.slides.slice(0, request.slideCount);
    while (deck.slides.length < request.slideCount) {
      deck.slides.push({ title: "New slide", subtitle: null, body: null, bullets: null, footer: null });
    }
  }
  return deck;
}
