import { GenerateRequestSchema } from "../shared/deck";
import { generateDeck } from "../server/openai";

function json(res: any, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

async function readJsonBody(req: any): Promise<any> {
  if (req.body != null) {
    if (typeof req.body === "string") return JSON.parse(req.body);
    return req.body;
  }
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.end();
    return;
  }

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

    const deck = await generateDeck({
      apiKey,
      model: process.env.OPENAI_MODEL ?? "gpt-5.2",
      prd: "",
      request: parsedReq.data,
    });

    json(res, 200, deck);
  } catch (err) {
    json(res, 500, { error: err instanceof Error ? err.message : "Unknown error" });
  }
}

