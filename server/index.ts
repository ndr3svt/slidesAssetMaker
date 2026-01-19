import "dotenv/config";
import path from "node:path";
import { DeckSchema, GenerateRequestSchema } from "../shared/deck";
import { generateDeck } from "./openai";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

function normalizeModel(model: string) {
  const trimmed = model.trim();
  if (!trimmed) return "gpt-5-nano";
  // Backwards compatibility with earlier placeholder value.
  if (trimmed === "gpt-5.2-low") return "gpt-5-nano";
  return trimmed;
}

function withCors(resp: Response) {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", process.env.CORS_ORIGIN ?? "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  return new Response(resp.body, { status: resp.status, headers });
}

async function readPrdText() {
  try {
    const file = Bun.file(path.join(import.meta.dir, "..", "prd.md"));
    if (!(await file.exists())) return "";
    return (await file.text()).trim();
  } catch {
    return "";
  }
}

function json(data: unknown, init?: ResponseInit) {
  return withCors(
    new Response(JSON.stringify(data), {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    }),
  );
}

const distDir = path.join(import.meta.dir, "..", "dist");

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));

    if (url.pathname === "/api/health") {
      return json({ ok: true });
    }

    if (url.pathname === "/api/generate" && req.method === "POST") {
      try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return json({ error: "Missing OPENAI_API_KEY in .env" }, { status: 500 });

        const body = await req.json().catch(() => null);
        const parsedReq = GenerateRequestSchema.safeParse(body);
        if (!parsedReq.success) {
          const issues = parsedReq.error.issues ?? [];
          const promptIssue = issues.find(
            (i) => i.path?.[0] === "prompt" && (i as any).code === "too_big",
          ) as any;
          if (promptIssue?.maximum) {
            return json(
              { error: `Prompt is too long (max ${promptIssue.maximum} characters).` },
              { status: 400 },
            );
          }
          return json({ error: "Invalid request.", issues }, { status: 400 });
        }

        const prd = await readPrdText();
        const deck = await generateDeck({
          apiKey,
          model: normalizeModel(process.env.OPENAI_MODEL ?? "gpt-5-nano"),
          prd,
          request: parsedReq.data,
        });

        const validated = DeckSchema.parse(deck);
        return json(validated);
      } catch (err) {
        return json(
          { error: err instanceof Error ? err.message : "Unknown error" },
          { status: 500 },
        );
      }
    }

    // Static assets (for `bun run start`)
    if (req.method !== "GET" && req.method !== "HEAD") {
      return withCors(new Response("Not found", { status: 404 }));
    }

    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = path.join(distDir, pathname);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return withCors(new Response(file));
    }

    // SPA fallback
    const indexFile = Bun.file(path.join(distDir, "index.html"));
    if (await indexFile.exists()) return withCors(new Response(indexFile));

    return withCors(new Response("UI not built. Run `bun run build` first.", { status: 404 }));
  },
});

console.log(`API/UI server running on http://localhost:${port}`);
