import { z } from "zod";

const GenerateRequestSchema = z.object({
  prompt: z.string().min(1).max(20000),
  slideCount: z.number().int().min(4).max(10).default(5),
  audience: z.string().max(200).optional(),
  tone: z.string().max(200).optional(),
});

const SlideSchema = z.object({
  title: z.string().min(1).max(90),
  subtitle: z.string().max(140).nullable(),
  body: z.string().max(520).nullable(),
  bullets: z.array(z.string().min(1).max(90)).max(8).nullable(),
  footer: z.string().max(80).nullable(),
});

const DeckSchema = z.object({
  title: z.string().min(1).max(120),
  slides: z.array(SlideSchema).min(4).max(10),
});

function json(res: any, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

function extractOutputText(result: any): string | null {
  if (typeof result?.output_text === "string") return result.output_text;
  if (Array.isArray(result?.output)) {
    for (const item of result.output) {
      for (const chunk of item?.content ?? []) {
        if (typeof chunk?.text === "string") return chunk.text;
      }
    }
  }
  const legacy = result?.choices?.[0]?.message?.content;
  return typeof legacy === "string" ? legacy : null;
}

async function readJsonBody(req: any): Promise<any> {
  if (req.body != null) {
    if (typeof req.body === "string") return JSON.parse(req.body);
    return req.body;
  }
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve());
    req.on("error", (e: unknown) => reject(e));
  });
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed." });
    return;
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      json(res, 500, { error: "Missing OPENAI_API_KEY." });
      return;
    }

    const body = await readJsonBody(req).catch(() => null);
    const parsedReq = GenerateRequestSchema.safeParse(body);
    if (!parsedReq.success) {
      json(res, 400, { error: "Invalid request.", issues: parsedReq.error.issues });
      return;
    }

    const request = parsedReq.data;

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
    ].join("\n");

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

    const model = (process.env.OPENAI_MODEL || "gpt-5.2").trim() || "gpt-5.2";
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
        const data = await resp.json().catch(() => null);
        const msg =
          typeof (data as any)?.error?.message === "string"
            ? (data as any).error.message
            : typeof (data as any)?.message === "string"
              ? (data as any).message
              : null;
        throw new Error(`OpenAI error (${resp.status}): ${(msg ?? "Request failed").slice(0, 240)}`);
      }
      const text = await resp.text().catch(() => "");
      const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      throw new Error(`OpenAI error (${resp.status}): ${clean.slice(0, 240)}`);
    }

    const data = await resp.json();
    const out = extractOutputText(data);
    if (!out) throw new Error("OpenAI response missing output text.");

    const parsedDeck = DeckSchema.safeParse(JSON.parse(out));
    if (!parsedDeck.success) throw new Error(`Invalid deck JSON: ${parsedDeck.error.message}`);

    const deck = parsedDeck.data;
    if (deck.slides.length !== request.slideCount) {
      deck.slides = deck.slides.slice(0, request.slideCount);
      while (deck.slides.length < request.slideCount) {
        deck.slides.push({ title: "New slide", subtitle: null, body: null, bullets: null, footer: null });
      }
    }

    json(res, 200, deck);
  } catch (err) {
    json(res, 500, { error: err instanceof Error ? err.message : "Unknown error" });
  }
}
