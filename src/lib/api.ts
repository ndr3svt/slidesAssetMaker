import type { Deck, GenerateRequest } from "@shared/deck";

function stripHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string, max = 260) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export async function generateDeck(req: GenerateRequest): Promise<Deck> {
  let resp: Response;
  try {
    resp = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  } catch {
    throw new Error("API not reachable. Is `bun run dev:api` running (and proxy port correct)?");
  }

  if (!resp.ok) {
    const ct = resp.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const data = (await resp.json().catch(() => null)) as unknown;
      const msg =
        typeof (data as any)?.error === "string"
          ? (data as any).error
          : typeof (data as any)?.message === "string"
            ? (data as any).message
            : null;
      throw new Error(msg ? truncate(msg) : `Request failed: ${resp.status}`);
    }
    const text = await resp.text().catch(() => "");
    const clean = truncate(stripHtml(text));
    throw new Error(clean || `Request failed: ${resp.status}`);
  }

  return (await resp.json()) as Deck;
}
