import type { Deck, GenerateRequest } from "@shared/deck";

export async function generateDeck(req: GenerateRequest): Promise<Deck> {
  const resp = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || `Request failed: ${resp.status}`);
  }

  return (await resp.json()) as Deck;
}

