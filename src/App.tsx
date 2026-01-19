import type { DragEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { generateDeck as generateDeckApi } from "@/lib/api";
import {
  apiDeckToEditor,
  clamp,
  createId,
  defaultEditorDeck,
  formatFromPreset,
  reorder,
  type Branding,
  type EditorDeck,
  type EditorSlide,
  type SlideElement,
  type SlideFormatPreset,
  type TextElement,
} from "@/lib/editor";
import { SlideCanvas } from "@/components/slide-canvas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, ImagePlus, Plus, Trash2 } from "lucide-react";

const CANVAS_WIDTH = 520;
const THUMB_WIDTH = 190;

export default function App() {
  const [deck, setDeck] = useState<EditorDeck>(defaultEditorDeck);
  const [selected, setSelected] = useState(0);
  const slide = deck.slides[selected] ?? deck.slides[0];
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const [branding, setBranding] = useState<Branding>({
    name: "Andres Villa Torres",
    handle: "andresvillatorres",
    nameColor: "#c7c7d7",
    handleColor: "#9aa0b4",
    arrowColor: "#7c7cff",
  });
  const [template, setTemplate] = useState("script");

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const slideImageInputRef = useRef<HTMLInputElement | null>(null);
  const dragFromIdxRef = useRef<number | null>(null);

  const [genPrompt, setGenPrompt] = useState("");
  const [genSlides, setGenSlides] = useState(5);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const canGenerate = genPrompt.trim().length > 0 && !genLoading;

  const selectedElement = useMemo(() => {
    const s = deck.slides[selected];
    if (!s || !selectedElementId) return null;
    return s.elements.find((e) => e.id === selectedElementId) ?? null;
  }, [deck.slides, selected, selectedElementId]);

  async function onGenerate() {
    if (!canGenerate) return;
    setGenLoading(true);
    setGenError(null);
    try {
      const slideCount = Math.min(10, Math.max(4, Math.trunc(genSlides || 5)));
      const next = await generateDeckApi({ prompt: genPrompt.trim(), slideCount });
      setDeck(apiDeckToEditor(next));
      setSelected(0);
      setSelectedElementId(null);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Failed to generate.");
    } finally {
      setGenLoading(false);
    }
  }

  function updateSlide(patch: Partial<EditorSlide>) {
    setDeck((d) => {
      const slides = d.slides.slice();
      slides[selected] = { ...slides[selected], ...patch };
      return { ...d, slides };
    });
  }

  function updateElement(id: string, patch: Partial<SlideElement>) {
    setDeck((d) => {
      const slides = d.slides.slice();
      const s = slides[selected];
      if (!s) return d;
      const elements = s.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as SlideElement) : e));
      slides[selected] = { ...s, elements };
      return { ...d, slides };
    });
  }

  function deleteElement(id: string) {
    setDeck((d) => {
      const slides = d.slides.slice();
      const s = slides[selected];
      if (!s) return d;
      slides[selected] = { ...s, elements: s.elements.filter((e) => e.id !== id) };
      return { ...d, slides };
    });
    setSelectedElementId((cur) => (cur === id ? null : cur));
  }

  function addText(kind: TextElement["kind"]) {
    const base: Omit<TextElement, "kind"> = {
      id: createId("el"),
      type: "text",
      text: kind === "title" ? "New title" : kind === "subtitle" ? "New subtitle" : "New body text",
      x: 90,
      y: kind === "title" ? 140 : kind === "subtitle" ? 360 : 440,
      w: 900,
      color: kind === "body" ? "#c7c7d7" : "#7c7cff",
      fontSize: kind === "title" ? 56 : kind === "subtitle" ? 18 : 16,
      fontWeight: kind === "title" ? 700 : kind === "subtitle" ? 600 : 400,
      align: "left",
      opacity: 1,
    };
    const el: TextElement = { ...base, kind };
    setDeck((d) => {
      const slides = d.slides.slice();
      const s = slides[selected];
      if (!s) return d;
      slides[selected] = { ...s, elements: [...s.elements, el] };
      return { ...d, slides };
    });
    setSelectedElementId(el.id);
  }

  async function onAvatarPick(file: File | null) {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setBranding((b) => ({ ...b, avatarSrc: dataUrl }));
  }

  async function onAddSlideImage(file: File | null) {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    const s = deck.slides[selected];
    if (!s) return;
    const w = Math.min(700, Math.round(s.format.width * 0.6));
    const h = w;
    const el: SlideElement = {
      id: createId("el"),
      type: "image",
      src: dataUrl,
      x: Math.round((s.format.width - w) / 2),
      y: Math.round((s.format.height - h) / 2) - 80,
      w,
      h,
      opacity: 1,
    };
    setDeck((d) => {
      const slides = d.slides.slice();
      const slide0 = slides[selected];
      if (!slide0) return d;
      slides[selected] = { ...slide0, elements: [...slide0.elements, el] };
      return { ...d, slides };
    });
    setSelectedElementId(el.id);
  }

  function addSlide() {
    const next: EditorSlide = {
      id: createId("slide"),
      format: formatFromPreset("linkedin_portrait"),
      backgroundColor: slide?.backgroundColor ?? "#000012",
      elements: [
        {
          id: createId("el"),
          type: "text",
          kind: "title",
          text: "New slide",
          x: 90,
          y: 140,
          w: 900,
          color: "#7c7cff",
          fontSize: 56,
          fontWeight: 700,
          align: "left",
          opacity: 1,
        },
      ],
    };
    setDeck((d) => ({ ...d, slides: [...d.slides, next] }));
    setSelected(deck.slides.length);
    setSelectedElementId(next.elements[0]?.id ?? null);
  }

  function duplicateSlide() {
    const s = deck.slides[selected];
    if (!s) return;
    const copy: EditorSlide = {
      ...s,
      id: createId("slide"),
      elements: s.elements.map((e) => ({ ...e, id: createId("el") })),
    };
    setDeck((d) => {
      const slides = d.slides.slice();
      slides.splice(selected + 1, 0, copy);
      return { ...d, slides };
    });
    setSelected(selected + 1);
    setSelectedElementId(null);
  }

  function deleteSlide() {
    if (deck.slides.length <= 1) return;
    setDeck((d) => {
      const slides = d.slides.slice();
      slides.splice(selected, 1);
      return { ...d, slides };
    });
    setSelected((cur) => clamp(cur - 1, 0, Math.max(0, deck.slides.length - 2)));
    setSelectedElementId(null);
  }

  function onDragStartThumb(idx: number, e: DragEvent) {
    dragFromIdxRef.current = idx;
    e.dataTransfer.setData("text/plain", String(idx));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDropThumb(idx: number, e: DragEvent) {
    e.preventDefault();
    const fromRaw = e.dataTransfer.getData("text/plain");
    const from = Number.parseInt(fromRaw || String(dragFromIdxRef.current ?? -1), 10);
    if (!Number.isFinite(from) || from < 0) return;
    if (from === idx) return;
    setDeck((d) => ({ ...d, slides: reorder(d.slides, from, idx) }));
    setSelected((cur) => {
      if (cur === from) return idx;
      if (from < cur && idx >= cur) return cur - 1;
      if (from > cur && idx <= cur) return cur + 1;
      return cur;
    });
    dragFromIdxRef.current = null;
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
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="h-12 w-12 overflow-hidden rounded-full bg-secondary ring-1 ring-border/50"
                    aria-label="Upload avatar"
                  >
                    {branding.avatarSrc ? (
                      <img src={branding.avatarSrc} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </button>
                  <div className="flex-1 space-y-2">
                    <Input value={branding.name} onChange={(e) => setBranding((b) => ({ ...b, name: e.target.value }))} />
                    <Input
                      value={branding.handle}
                      onChange={(e) => setBranding((b) => ({ ...b, handle: e.target.value }))}
                    />
                  </div>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onAvatarPick(e.target.files?.[0] ?? null)}
                />
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Name</div>
                    <Input
                      type="color"
                      value={branding.nameColor}
                      onChange={(e) => setBranding((b) => ({ ...b, nameColor: e.target.value }))}
                      className="h-9 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Handle</div>
                    <Input
                      type="color"
                      value={branding.handleColor}
                      onChange={(e) => setBranding((b) => ({ ...b, handleColor: e.target.value }))}
                      className="h-9 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Arrow</div>
                    <Input
                      type="color"
                      value={branding.arrowColor}
                      onChange={(e) => setBranding((b) => ({ ...b, arrowColor: e.target.value }))}
                      className="h-9 p-1"
                    />
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="text-xs font-semibold text-muted-foreground">Template style</div>
              <div className="mt-2">
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="script">Sooft slides</SelectItem>
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
                      value={slide?.backgroundColor ?? "#000012"}
                      onChange={(e) => updateSlide({ backgroundColor: e.target.value })}
                      className="h-10 w-12 p-1"
                      aria-label="Background color"
                    />
                    <Input
                      value={slide?.backgroundColor ?? "#000012"}
                      onChange={(e) => updateSlide({ backgroundColor: e.target.value })}
                      className="font-mono text-xs"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </aside>

        <main className="relative flex flex-1 flex-col">
          <div className="flex-1 bg-background">
            <div className="flex flex-col items-center px-6 pt-6">
              {slide ? (
                <SlideCanvas
                  slide={slide}
                  index={selected}
                  branding={branding}
                  widthPx={CANVAS_WIDTH}
                  selectedElementId={selectedElementId}
                  onSelectElement={setSelectedElementId}
                  onUpdateElement={updateElement}
                  className={selectedElementId ? "" : "ring-1 ring-border/40"}
                />
              ) : null}
              <div className="mt-3 flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={duplicateSlide} aria-label="Duplicate slide">
                  <Copy className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={deleteSlide}
                  aria-label="Delete slide"
                  disabled={deck.slides.length <= 1}
                >
                  <Trash2 className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>

              <div className="mt-6 flex w-full items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {deck.title} · {deck.slides.length} slides
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => slideImageInputRef.current?.click()}
                    aria-label="Add image to slide"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Image
                  </Button>
                  <Button size="sm" variant="secondary" onClick={addSlide}>
                    <Plus className="h-4 w-4" />
                    Add slide
                  </Button>
                  <input
                    ref={slideImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onAddSlideImage(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>

              <div className="mt-3 w-full overflow-x-auto pb-24">
                <div className="flex gap-3">
                  {deck.slides.map((s, idx) => (
                    <button
                      key={s.id}
                      draggable
                      onDragStart={(e) => onDragStartThumb(idx, e)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDropThumb(idx, e)}
                      onClick={() => {
                        setSelected(idx);
                        setSelectedElementId(null);
                      }}
                      className="text-left"
                      aria-label={`Select slide ${idx + 1}`}
                    >
                      <Card
                        className={[
                          "relative w-[200px] shrink-0 overflow-hidden rounded-2xl",
                          idx === selected ? "ring-2 ring-ring" : "ring-1 ring-border/40",
                        ].join(" ")}
                      >
                        <div className="p-2">
                          <SlideCanvas
                            slide={s}
                            index={idx}
                            branding={branding}
                            widthPx={THUMB_WIDTH}
                            interactive={false}
                            selectedElementId={null}
                            onSelectElement={() => {}}
                            onUpdateElement={() => {}}
                            className="border-0 shadow-none"
                          />
                        </div>
                      </Card>
                    </button>
	                  ))}
	                </div>
	              </div>
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

              <Separator className="my-4" />

              <div className="text-xs font-semibold text-muted-foreground">Canvas</div>
              <div className="mt-3 space-y-3">
                <Select
                  value={slide?.format.preset ?? "linkedin_portrait"}
                  onValueChange={(v) => {
                    const preset = v as SlideFormatPreset;
                    updateSlide({ format: formatFromPreset(preset) });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin_portrait">LinkedIn (1080×1350)</SelectItem>
                    <SelectItem value="linkedin_square">LinkedIn square (1080×1080)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>

                {slide?.format.preset === "custom" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={200}
                      value={slide.format.width}
                      onChange={(e) =>
                        updateSlide({
                          format: { ...slide.format, width: Math.max(200, Math.trunc(Number(e.target.value) || 1080)) },
                        })
                      }
                    />
                    <Input
                      type="number"
                      min={200}
                      value={slide.format.height}
                      onChange={(e) =>
                        updateSlide({
                          format: { ...slide.format, height: Math.max(200, Math.trunc(Number(e.target.value) || 1350)) },
                        })
                      }
                    />
                  </div>
                ) : null}
              </div>

              <Separator className="my-5" />

              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-muted-foreground">Elements</div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => addText("title")}>
                    Title
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => addText("body")}>
                    Text
                  </Button>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {(slide?.elements ?? []).map((el) => (
                  <button
                    key={el.id}
                    className={[
                      "w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-left text-sm",
                      selectedElementId === el.id ? "ring-2 ring-ring" : "hover:bg-secondary/60",
                    ].join(" ")}
                    onClick={() => setSelectedElementId(el.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-foreground">
                        {el.type === "text" ? `${el.kind}: ${el.text.slice(0, 32)}` : "image"}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteElement(el.id);
                        }}
                        aria-label="Delete element"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      x:{Math.round(el.x)} y:{Math.round(el.y)}
                    </div>
                  </button>
                ))}
              </div>

              <Separator className="my-5" />

              <div className="text-xs font-semibold text-muted-foreground">Properties</div>
              <div className="mt-3 space-y-4">
                {selectedElement?.type === "text" ? (
                  <>
                    <Textarea
                      value={selectedElement.text}
                      onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })}
                      className="min-h-[90px]"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Color</div>
                        <Input
                          type="color"
                          value={selectedElement.color}
                          onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                          className="h-9 p-1"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Width</div>
                        <Input
                          type="number"
                          min={100}
                          value={selectedElement.w}
                          onChange={(e) => updateElement(selectedElement.id, { w: Math.max(100, Number(e.target.value) || 900) })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Size</span>
                        <span className="font-mono text-xs text-muted-foreground">{selectedElement.fontSize}</span>
                      </div>
                      <Slider
                        value={[selectedElement.fontSize]}
                        min={10}
                        max={72}
                        step={1}
                        onValueChange={(v) => updateElement(selectedElement.id, { fontSize: v[0] ?? selectedElement.fontSize })}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Weight</div>
                      <Select
                        value={String(selectedElement.fontWeight)}
                        onValueChange={(v) =>
                          updateElement(selectedElement.id, { fontWeight: Number(v) as TextElement["fontWeight"] })
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
                          variant={selectedElement.align === "left" ? "default" : "secondary"}
                          size="sm"
                          onClick={() => updateElement(selectedElement.id, { align: "left" })}
                        >
                          Left
                        </Button>
                        <Button
                          variant={selectedElement.align === "center" ? "default" : "secondary"}
                          size="sm"
                          onClick={() => updateElement(selectedElement.id, { align: "center" })}
                        >
                          Center
                        </Button>
                      </div>
                    </div>
                  </>
                ) : selectedElement?.type === "image" ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Width</div>
                        <Input
                          type="number"
                          min={20}
                          value={selectedElement.w}
                          onChange={(e) => updateElement(selectedElement.id, { w: Math.max(20, Number(e.target.value) || selectedElement.w) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Height</div>
                        <Input
                          type="number"
                          min={20}
                          value={selectedElement.h}
                          onChange={(e) => updateElement(selectedElement.id, { h: Math.max(20, Number(e.target.value) || selectedElement.h) })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Opacity</span>
                        <span className="font-mono text-xs text-muted-foreground">{Math.round(selectedElement.opacity * 100)}%</span>
                      </div>
                      <Slider
                        value={[selectedElement.opacity]}
                        min={0.05}
                        max={1}
                        step={0.05}
                        onValueChange={(v) => updateElement(selectedElement.id, { opacity: v[0] ?? selectedElement.opacity })}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Select an element on the slide to edit it.</div>
                )}
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
