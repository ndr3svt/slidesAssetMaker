import { useMemo, useState } from "react";
import type { Deck, Slide } from "@shared/deck";
import { generateDeck as generateDeckApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SlideStyle = {
  bg: string;
  titleColor: string;
  bodyColor: string;
  titleSize: number;
  bodySize: number;
  titleWeight: 400 | 600 | 700;
  align: "left" | "center";
  showFooter: boolean;
};

const defaultDeck: Deck = {
  title: "Coding in 2026",
  slides: [
    {
      title: "Coding in 2026:\nBeyond Syntax",
      subtitle: "Why systems literacy matters more than memorizing code",
      body: "AI tools have changed programming, but real value comes from modularity, systems thinking, and intent — not just syntax.",
      footer: "andresvillatorres",
    },
    {
      title: "Syntax is Easy to\nOutsource",
      body: "Language rules aren’t the bottleneck. LLMs wire features, fix typos, and generate UI & backend code in seconds.",
      footer: "andresvillatorres",
    },
    {
      title: "The Real Challenge:\nUnderstanding the Machine",
      subtitle: "What’s happening behind the scenes?",
      body: "When a feature “looks fine” but something’s off, you need to grasp state, flow, and what code does on every request.",
      footer: "andresvillatorres",
    },
    {
      title: "LLMs Suggest.\nHumans Decide.",
      body: "Patterns help you reason about tradeoffs, errors, and failure modes. But humans spot intent and context.",
      footer: "andresvillatorres",
    },
  ],
};

export default function App() {
  const [deck, setDeck] = useState<Deck>(defaultDeck);
  const [selected, setSelected] = useState(0);
  const slide = deck.slides[selected] ?? deck.slides[0];

  const [brandName, setBrandName] = useState("Andres Villa Torres");
  const [brandHandle, setBrandHandle] = useState("andresvillatorres");
  const [template, setTemplate] = useState("script");

  const [style, setStyle] = useState<SlideStyle>({
    bg: "#000012",
    titleColor: "#7c7cff",
    bodyColor: "#c7c7d7",
    titleSize: 44,
    bodySize: 14,
    titleWeight: 700,
    align: "left",
    showFooter: true,
  });

  const [genPrompt, setGenPrompt] = useState("");
  const [genSlides, setGenSlides] = useState(5);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const canGenerate = genPrompt.trim().length > 0 && !genLoading;

  const previewBg = useMemo(() => ({ background: style.bg }), [style.bg]);

  async function onGenerate() {
    if (!canGenerate) return;
    setGenLoading(true);
    setGenError(null);
    try {
      const slideCount = Math.min(10, Math.max(4, Math.trunc(genSlides || 5)));
      const next = await generateDeckApi({ prompt: genPrompt.trim(), slideCount });
      setDeck(next);
      setSelected(0);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Failed to generate.");
    } finally {
      setGenLoading(false);
    }
  }

  function updateSlide(patch: Partial<Slide>) {
    setDeck((d) => {
      const slides = d.slides.slice();
      slides[selected] = { ...slides[selected], ...patch };
      return { ...d, slides };
    });
  }

  return (
    <div className="h-full w-full">
      <header className="flex h-12 items-center gap-2 border-b border-border bg-card px-3">
        <Button variant="secondary" size="sm">
          Settings
        </Button>
        <Button variant="secondary" size="sm">
          Templates
        </Button>
        <Separator orientation="vertical" className="mx-2 h-6" />
        <div className="flex flex-1 items-center gap-2">
          <Input className="max-w-[200px]" placeholder="Upload file" disabled />
          <Input className="max-w-[200px]" placeholder="AI photos" disabled />
          <Input className="max-w-[220px]" placeholder="Search Unsplash" disabled />
          <Input className="max-w-[200px]" placeholder="Search Giphy" disabled />
        </div>
        <Button size="sm" className="min-w-[120px]">
          Carousel
        </Button>
      </header>

      <div className="flex h-[calc(100%-3rem)]">
        <aside className="w-[280px] border-r border-border bg-card">
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="text-xs font-semibold text-muted-foreground">Brand settings</div>
              <div className="mt-3 space-y-2">
                <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} />
                <Input value={brandHandle} onChange={(e) => setBrandHandle(e.target.value)} />
              </div>

              <Separator className="my-4" />

              <div className="text-xs font-semibold text-muted-foreground">Template style</div>
              <div className="mt-2">
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="script">Scribe slides</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="my-4" />

              <div className="text-xs font-semibold text-muted-foreground">Background design</div>
              <Tabs defaultValue="color" className="mt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="color" className="flex-1">
                    Color
                  </TabsTrigger>
                  <TabsTrigger value="image" className="flex-1" disabled>
                    Image
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="color">
                  <div className="mt-3 flex items-center gap-2">
                    <Input
                      type="color"
                      value={style.bg}
                      onChange={(e) => setStyle((s) => ({ ...s, bg: e.target.value }))}
                      className="h-10 w-12 p-1"
                      aria-label="Background color"
                    />
                    <Input
                      value={style.bg}
                      onChange={(e) => setStyle((s) => ({ ...s, bg: e.target.value }))}
                      className="font-mono text-xs"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <Separator className="my-4" />

              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-muted-foreground">Footer</div>
                <Switch
                  checked={style.showFooter}
                  onCheckedChange={(v) => setStyle((s) => ({ ...s, showFooter: v }))}
                />
              </div>
            </div>
          </ScrollArea>
        </aside>

        <main className="relative flex flex-1 flex-col">
          <div className="flex-1 bg-background">
            <div className="px-6 py-6">
              <div className="text-sm text-muted-foreground">
                {deck.title} · {deck.slides.length} slides
              </div>
            </div>

            <div className="flex gap-5 overflow-x-auto px-6 pb-24">
              {deck.slides.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelected(idx)}
                  className="text-left"
                  aria-label={`Select slide ${idx + 1}`}
                >
                  <Card
                    className={[
                      "relative w-[280px] shrink-0 overflow-hidden rounded-2xl",
                      idx === selected ? "ring-2 ring-ring" : "ring-1 ring-border/40",
                    ].join(" ")}
                  >
                    <div className="absolute left-2 top-2 text-xs text-muted-foreground">{idx + 1}</div>
                    <div className="aspect-[4/5] p-7" style={previewBg}>
                      <div
                        className="whitespace-pre-line"
                        style={{
                          color: style.titleColor,
                          fontSize: style.titleSize,
                          fontWeight: style.titleWeight,
                          lineHeight: 1.05,
                          textAlign: style.align,
                        }}
                      >
                        {s.title}
                      </div>
                      {s.subtitle ? (
                        <div
                          className="mt-4"
                          style={{
                            color: style.titleColor,
                            opacity: 0.9,
                            fontSize: 16,
                            fontWeight: 600,
                            textAlign: style.align,
                          }}
                        >
                          {s.subtitle}
                        </div>
                      ) : null}
                      {s.body ? (
                        <div
                          className="mt-4"
                          style={{
                            color: style.bodyColor,
                            fontSize: style.bodySize,
                            lineHeight: 1.45,
                            textAlign: style.align,
                          }}
                        >
                          {s.body}
                        </div>
                      ) : null}
                      {style.showFooter ? (
                        <div className="absolute bottom-6 left-7 right-7 text-xs text-muted-foreground">
                          {brandName} · {brandHandle}
                        </div>
                      ) : null}
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-4 left-0 right-0 flex items-center justify-center">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-panel">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={genLoading}>
                    {genLoading ? "Generating…" : "AI Generate"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate carousel</DialogTitle>
                    <DialogDescription>Describe what you want. The API uses `OPENAI_API_KEY` from `.env`.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Textarea
                      value={genPrompt}
                      onChange={(e) => setGenPrompt(e.target.value)}
                      placeholder="Topic, angle, audience, and desired takeaway…"
                    />
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-muted-foreground">Slides</div>
                      <Input
                        type="number"
                        min={4}
                        max={10}
                        value={genSlides}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setGenSlides(Number.isFinite(v) ? v : 5);
                        }}
                        className="w-24"
                      />
                      <div className="flex-1" />
                      <Button onClick={onGenerate} disabled={!canGenerate}>
                        Generate
                      </Button>
                    </div>
                    {genError ? <div className="text-sm text-destructive">{genError}</div> : null}
                  </div>
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="secondary" disabled>
                Export
              </Button>
            </div>
          </div>
        </main>

        <aside className="w-[340px] border-l border-border bg-card">
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="text-xs font-semibold text-muted-foreground">Slide {selected + 1}</div>
              <div className="mt-3 space-y-3">
                <Textarea
                  value={slide?.title ?? ""}
                  onChange={(e) => updateSlide({ title: e.target.value })}
                  className="min-h-[90px]"
                />
                <Input
                  placeholder="Subtitle (optional)"
                  value={slide?.subtitle ?? ""}
                  onChange={(e) => updateSlide({ subtitle: e.target.value || undefined })}
                />
                <Textarea
                  placeholder="Body (optional)"
                  value={slide?.body ?? ""}
                  onChange={(e) => updateSlide({ body: e.target.value || undefined })}
                />
              </div>

              <Separator className="my-5" />

              <div className="text-xs font-semibold text-muted-foreground">Typography</div>
              <div className="mt-3 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Title size</span>
                    <span className="font-mono text-xs text-muted-foreground">{style.titleSize}</span>
                  </div>
                  <Slider
                    value={[style.titleSize]}
                    min={28}
                    max={60}
                    step={1}
                    onValueChange={(v) => setStyle((s) => ({ ...s, titleSize: v[0] ?? s.titleSize }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Body size</span>
                    <span className="font-mono text-xs text-muted-foreground">{style.bodySize}</span>
                  </div>
                  <Slider
                    value={[style.bodySize]}
                    min={12}
                    max={22}
                    step={1}
                    onValueChange={(v) => setStyle((s) => ({ ...s, bodySize: v[0] ?? s.bodySize }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Title color</div>
                    <Input
                      type="color"
                      value={style.titleColor}
                      onChange={(e) => setStyle((s) => ({ ...s, titleColor: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Body color</div>
                    <Input
                      type="color"
                      value={style.bodyColor}
                      onChange={(e) => setStyle((s) => ({ ...s, bodyColor: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Weight</div>
                  <Select
                    value={String(style.titleWeight)}
                    onValueChange={(v) =>
                      setStyle((s) => ({ ...s, titleWeight: Number(v) as SlideStyle["titleWeight"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Weight" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="400">Regular</SelectItem>
                      <SelectItem value="600">Semi-bold</SelectItem>
                      <SelectItem value="700">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Alignment</div>
                  <div className="flex gap-2">
                    <Button
                      variant={style.align === "left" ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setStyle((s) => ({ ...s, align: "left" }))}
                    >
                      Left
                    </Button>
                    <Button
                      variant={style.align === "center" ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setStyle((s) => ({ ...s, align: "center" }))}
                    >
                      Center
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
