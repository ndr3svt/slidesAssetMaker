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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, FileJson, ImagePlus, Info, Plus, Save, Trash2, User } from "lucide-react";
import { downloadBlob, exportDeckToPdfBlob } from "@/lib/export";
import { parseProjectOrLegacy, serializeProject } from "@/lib/project";

const CANVAS_WIDTH = 520;
const THUMB_WIDTH = 190;

export default function App() {
  const [deck, setDeck] = useState<EditorDeck>(defaultEditorDeck);
  const [selected, setSelected] = useState(0);
  const slide = deck.slides[selected] ?? deck.slides[0];
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const [branding, setBranding] = useState<Branding>({
    name: "Your Name",
    handle: "yournickname",
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
  const genPromptMax = 20000;
  const [genOpen, setGenOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [importJsonOpen, setImportJsonOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importJsonError, setImportJsonError] = useState<string | null>(null);
  const importJsonFileRef = useRef<HTMLInputElement | null>(null);

  const [exportJsonOpen, setExportJsonOpen] = useState(false);
  const [exportJsonText, setExportJsonText] = useState("");
  const [exportJsonError, setExportJsonError] = useState<string | null>(null);
  const exportJsonFileRef = useRef<HTMLInputElement | null>(null);

  const canGenerate = genPrompt.trim().length > 0 && genPrompt.length <= genPromptMax && !genLoading;

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
      setGenOpen(false);
      pushToast("Carousel generated.");
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Failed to generate.");
    } finally {
      setGenLoading(false);
    }
  }

  async function onExportPdf() {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const blob = await exportDeckToPdfBlob(deck, branding);
      const name = (deck.title || "carousel").replace(/[^\w\- ]+/g, "").trim().slice(0, 64) || "carousel";
      downloadBlob(blob, `${name}.pdf`);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Failed to export.");
    } finally {
      setExporting(false);
    }
  }

  function downloadJson(filename: string, data: unknown) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    downloadBlob(blob, filename);
  }

  function pushToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }

  async function copyTextToClipboard(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  function refreshExportJson() {
    const project = serializeProject(deck, branding);
    setExportJsonText(JSON.stringify(project, null, 2));
    setExportJsonError(null);
  }

  function onExportCarouselJsonDownload(text: string) {
    try {
      const raw = JSON.parse(text);
      const parsed = parseProjectOrLegacy(raw);
      if (!parsed || parsed.kind !== "project") {
        setExportJsonError("Export JSON must be a sooft_carousel project (version 1).");
        return;
      }
      const name = (deck.title || "carousel").replace(/[^\w\- ]+/g, "").trim().slice(0, 64) || "carousel";
      downloadJson(`${name}.json`, parsed.project);
      pushToast("Exported project JSON.");
    } catch {
      setExportJsonError("Invalid JSON (parse error).");
    }
  }

  function onImportCarouselJson() {
    setImportJsonError(null);
    try {
      const raw = JSON.parse(importJsonText);
      const parsed = parseProjectOrLegacy(raw);
      if (!parsed) {
        setImportJsonError("Invalid JSON. Expected a sooft_carousel project or a legacy {title, slides[]} deck.");
        return;
      }
      if (parsed.kind === "project") {
        setDeck(parsed.project.deck);
        setBranding(parsed.project.branding);
      } else {
        setDeck(apiDeckToEditor(parsed.deck));
      }
      setSelected(0);
      setSelectedElementId(null);
      setImportJsonOpen(false);
      pushToast("Imported JSON.");
    } catch {
      setImportJsonError("Invalid JSON (parse error).");
    }
  }

  async function onLoadJsonFile(file: File | null, into: "import" | "export") {
    if (!file) return;
    const text = await fileToText(file);
    if (into === "import") {
      setImportJsonText(text);
      setImportJsonError(null);
    } else {
      setExportJsonText(text);
      setExportJsonError(null);
    }
  }

  type TemplateV1 = {
    version: 1;
    savedAt: string;
    branding: Branding;
    slide: {
      format: EditorSlide["format"];
      backgroundColor: string;
      elements: Array<
        | (Omit<TextElement, "id" | "text"> & { type: "text"; kind: TextElement["kind"] })
        | { type: "image"; x: number; y: number; w: number; h: number; opacity: number }
      >;
    };
  };

  function currentTemplate(): TemplateV1 | null {
    const s = deck.slides[selected];
    if (!s) return null;
    const { avatarSrc: _avatarSrc, ...brandingWithoutAvatar } = branding;
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      branding: brandingWithoutAvatar,
      slide: {
        format: s.format,
        backgroundColor: s.backgroundColor,
        elements: s.elements.map((e) => {
          if (e.type === "image") return { type: "image", x: e.x, y: e.y, w: e.w, h: e.h, opacity: e.opacity };
          return {
            type: "text",
            kind: e.kind,
            x: e.x,
            y: e.y,
            w: e.w,
            h: e.h,
            color: e.color,
            fontSize: e.fontSize,
            lineHeight: e.lineHeight ?? 1.25,
            fontWeight: e.fontWeight,
            align: e.align,
            opacity: e.opacity,
          };
        }),
      },
    };
  }

  function onSaveTemplate() {
    const t = currentTemplate();
    if (!t) return;
    localStorage.setItem("sooft_template_v1", JSON.stringify(t));
    pushToast("Template saved.");
  }

  function onExportTemplate() {
    const t = currentTemplate();
    if (!t) return;
    downloadJson("sooft-template.json", t);
    pushToast("Exported template JSON.");
  }

  const importExampleJson = `{
  "type": "sooft_carousel",
  "version": 1,
  "savedAt": "2026-01-01T00:00:00.000Z",
  "branding": {
    "name": "Andres Villa Torres",
    "handle": "andresvillatorres",
    "nameColor": "#c7c7d7",
    "handleColor": "#9aa0b4",
    "arrowColor": "#7c7cff"
  },
  "deck": {
    "title": "My carousel",
    "slides": [
      {
        "id": "slide_...",
        "format": { "preset": "linkedin_portrait", "width": 1080, "height": 1350 },
        "backgroundColor": "#000012",
        "elements": [
          {
            "id": "el_...",
            "type": "text",
            "kind": "title",
            "text": "Slide title",
            "x": 90,
            "y": 140,
            "w": 900,
            "h": 240,
            "color": "#7c7cff",
            "fontSize": 56,
            "lineHeight": 1.05,
            "fontWeight": 700,
            "align": "left",
            "opacity": 1
          }
        ]
      }
    ]
  }
}`;

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
      h: kind === "title" ? 240 : kind === "subtitle" ? 90 : 320,
      color: kind === "body" ? "#c7c7d7" : "#7c7cff",
      fontSize: kind === "title" ? 56 : kind === "subtitle" ? 18 : 16,
      lineHeight: kind === "title" ? 1.05 : kind === "subtitle" ? 1.2 : 1.35,
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
          h: 240,
          color: "#7c7cff",
          fontSize: 56,
          lineHeight: 1.05,
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
    <TooltipProvider>
    <div className="h-full w-full">
      {genLoading ? (
        <div className="fixed left-0 top-0 z-[400] h-[2px] w-full overflow-hidden bg-transparent">
          <div className="indeterminate-bar h-full w-1/4 bg-primary" />
        </div>
      ) : null}
      <header className="flex h-12 items-center gap-2 border-b border-border bg-card px-3">
        <Button variant="secondary" size="sm">
          Settings
        </Button>
        <Button variant="secondary" size="sm">
          Templates
        </Button>
        <Separator orientation="vertical" className="mx-2 h-6" />
        {/* <div className="flex flex-1 items-center gap-2">
          <Input className="max-w-[200px]" placeholder="Upload file" disabled />
          <Input className="max-w-[200px]" placeholder="AI photos" disabled />
          <Input className="max-w-[220px]" placeholder="Search Unsplash" disabled />
          <Input className="max-w-[200px]" placeholder="Search Giphy" disabled />
        </div> */}
        <Button size="sm" className="min-w-[120px]">
          Carousel
        </Button>
      </header>

	      <div className="flex h-[calc(100%-3rem)] overflow-hidden">
        <aside className="w-[280px] border-r border-border bg-card">
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="text-xs font-semibold text-muted-foreground">Brand settings</div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border/50"
                    aria-label="Upload avatar"
                  >
                    {branding.avatarSrc ? (
                      <img src={branding.avatarSrc} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
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
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="secondary" onClick={onSaveTemplate}>
                  <Save className="h-4 w-4" />
                  Save template
                </Button>
                <Button size="sm" variant="secondary" onClick={onExportTemplate}>
                  <FileJson className="h-4 w-4" />
                  Export template
                </Button>
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

        <main className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex-1 min-w-0 bg-background">
            <div className="flex flex-col items-center px-6 pt-6">
              {slide ? (
                <SlideCanvas
                  slide={slide}
                  index={selected}
                  isLast={selected === deck.slides.length - 1}
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

              <div className="mt-3 w-full max-w-full overflow-x-auto pb-24 scrollbar-none">
                <div className="inline-flex gap-3 pr-6">
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
                            isLast={idx === deck.slides.length - 1}
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
		              <Dialog open={genOpen} onOpenChange={setGenOpen}>
	                <DialogTrigger asChild>
	                  <Button
	                    size="sm"
	                    disabled={genLoading}
	                    onClick={() => {
	                      setGenOpen(true);
	                      setGenError(null);
	                    }}
	                  >
	                    {genLoading ? "Generating…" : "AI Generate"}
	                  </Button>
	                </DialogTrigger>
	                <DialogContent className="w-[min(920px,95vw)] max-w-none min-h-[600px] max-h-[90vh] overflow-y-auto scrollbar-none">
	                  <DialogHeader>
	                    <DialogTitle>Generate carousel</DialogTitle>
	                    <DialogDescription>Describe what you want. The API uses `OPENAI_API_KEY` from `.env`.</DialogDescription>
	                  </DialogHeader>
	                  <div className="space-y-3">
                    <Textarea
                      value={genPrompt}
                      onChange={(e) => setGenPrompt(e.target.value)}
                      placeholder="Topic, angle, audience, and desired takeaway…"
                      className="min-h-[260px] max-h-[60vh] resize-y scrollbar-none"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div>{genPrompt.length > genPromptMax ? "Prompt is too long." : " "}</div>
                      <div className={genPrompt.length > genPromptMax ? "text-destructive" : ""}>
                        {genPrompt.length}/{genPromptMax}
                      </div>
                    </div>
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

	              <Dialog
	                open={importJsonOpen}
	                onOpenChange={(open) => {
	                  setImportJsonOpen(open);
	                  if (open) setImportJsonError(null);
	                }}
	              >
	                <DialogTrigger asChild>
	                  <Button size="sm" variant="secondary">
	                    <FileJson className="h-4 w-4" />
	                    Import JSON
	                  </Button>
	                </DialogTrigger>
	                <DialogContent className="w-[min(920px,95vw)] max-w-none min-h-[600px] max-h-[90vh] overflow-y-auto scrollbar-none">
	                  <DialogHeader className="relative pr-14">
	                    <DialogTitle>Import carousel JSON</DialogTitle>
	                    <DialogDescription>Paste a deck JSON. Missing fields are treated as null.</DialogDescription>
	                    <div className="absolute right-10 top-[50px]">
	                      <Tooltip>
	                        <TooltipTrigger asChild>
	                          <Button variant="secondary" size="icon" aria-label="Show JSON example">
	                            <Info className="h-4 w-4" />
	                          </Button>
	                        </TooltipTrigger>
	                        <TooltipContent
	                          className="max-h-[260px] cursor-pointer overflow-auto whitespace-pre font-mono text-[11px] leading-relaxed"
	                          title="Click to copy"
	                          onClick={async () => {
	                            try {
	                              await copyTextToClipboard(importExampleJson);
	                              pushToast("Copied JSON example.");
	                            } catch {
	                              pushToast("Copy failed.");
	                            }
	                          }}
	                        >
{importExampleJson}
	                        </TooltipContent>
	                      </Tooltip>
	                    </div>
	                  </DialogHeader>
		                  <div className="space-y-3">
		                    <div className="flex items-center justify-between">
		                      <Button
		                        type="button"
		                        variant="secondary"
		                        size="sm"
		                        onClick={() => importJsonFileRef.current?.click()}
		                      >
		                        Load file
		                      </Button>
		                      <input
		                        ref={importJsonFileRef}
		                        type="file"
		                        accept="application/json,.json"
		                        className="hidden"
		                        onChange={(e) => onLoadJsonFile(e.target.files?.[0] ?? null, "import")}
		                      />
		                    </div>
		                    <Textarea
		                      value={importJsonText}
		                      onChange={(e) => setImportJsonText(e.target.value)}
		                      placeholder='{"title":"...","slides":[...]}'
		                      className="min-h-[360px] max-h-[70vh] resize-y scrollbar-none font-mono text-xs"
		                    />
	                    <div className="flex items-center justify-end gap-2">
	                      <Button variant="secondary" onClick={() => setImportJsonOpen(false)}>
	                        Cancel
	                      </Button>
	                      <Button onClick={onImportCarouselJson}>Import</Button>
	                    </div>
	                    {importJsonError ? <div className="text-sm text-destructive">{importJsonError}</div> : null}
	                  </div>
		                </DialogContent>
		              </Dialog>

	              <Dialog
	                open={exportJsonOpen}
	                onOpenChange={(open) => {
	                  setExportJsonOpen(open);
	                  if (open) refreshExportJson();
	                  if (open) setExportJsonError(null);
	                }}
	              >
	                <DialogTrigger asChild>
	                  <Button size="sm" variant="secondary">
	                    <FileJson className="h-4 w-4" />
	                    Export JSON
	                  </Button>
	                </DialogTrigger>
	                <DialogContent className="w-[min(920px,95vw)] max-w-none min-h-[600px] max-h-[90vh] overflow-y-auto scrollbar-none">
	                  <DialogHeader>
	                    <DialogTitle>Export project JSON</DialogTitle>
	                    <DialogDescription>
	                      Includes full slide layout (positions, colors, sizes, images, branding).
	                    </DialogDescription>
	                  </DialogHeader>
	                  <div className="space-y-3">
	                    <div className="flex items-center justify-between gap-2">
	                      <div className="flex gap-2">
	                        <Button type="button" variant="secondary" size="sm" onClick={refreshExportJson}>
	                          Refresh
	                        </Button>
	                        <Button
	                          type="button"
	                          variant="secondary"
	                          size="sm"
	                          onClick={() => exportJsonFileRef.current?.click()}
	                        >
	                          Load file
	                        </Button>
	                        <input
	                          ref={exportJsonFileRef}
	                          type="file"
	                          accept="application/json,.json"
	                          className="hidden"
	                          onChange={(e) => onLoadJsonFile(e.target.files?.[0] ?? null, "export")}
	                        />
	                      </div>
	                      <Button type="button" onClick={() => onExportCarouselJsonDownload(exportJsonText)}>
	                        Download
	                      </Button>
	                    </div>
	                    <Textarea
	                      value={exportJsonText}
	                      onChange={(e) => setExportJsonText(e.target.value)}
	                      className="min-h-[420px] max-h-[70vh] resize-y scrollbar-none font-mono text-xs"
	                    />
	                    {exportJsonError ? <div className="text-sm text-destructive">{exportJsonError}</div> : null}
	                  </div>
	                </DialogContent>
	              </Dialog>
	              <Button size="sm" variant="secondary" onClick={onExportPdf} disabled={exporting}>
	                {exporting ? "Exporting…" : "Export PDF"}
	              </Button>
	            </div>
	          </div>
          {exportError ? (
            <div className="pointer-events-none fixed bottom-6 left-1/2 z-[300] -translate-x-1/2">
              <div className="pointer-events-auto rounded-lg border border-border bg-card px-3 py-2 text-sm text-destructive shadow-panel">
                {exportError}
              </div>
            </div>
          ) : null}
          {toast ? (
            <div className="pointer-events-none fixed bottom-6 left-1/2 z-[300] -translate-x-1/2">
              <div className="pointer-events-auto rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-panel">
                {toast}
              </div>
            </div>
          ) : null}
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
                          onChange={(e) =>
                            updateElement(selectedElement.id, {
                              w: Math.max(100, Math.trunc(Number(e.target.value) || selectedElement.w)),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Height</div>
                        <Input
                          type="number"
                          min={40}
                          value={selectedElement.h}
                          onChange={(e) =>
                            updateElement(selectedElement.id, {
                              h: Math.max(40, Math.trunc(Number(e.target.value) || selectedElement.h)),
                            })
                          }
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
                        max={192}
                        step={1}
                        onValueChange={(v) => updateElement(selectedElement.id, { fontSize: v[0] ?? selectedElement.fontSize })}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Line height</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {selectedElement.lineHeight.toFixed(2)}
                        </span>
                      </div>
                      <Slider
                        value={[selectedElement.lineHeight]}
                        min={0.8}
                        max={2.2}
                        step={0.05}
                        onValueChange={(v) =>
                          updateElement(selectedElement.id, {
                            lineHeight: Number((v[0] ?? selectedElement.lineHeight).toFixed(2)),
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Opacity</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {Math.round(selectedElement.opacity * 100)}%
                        </span>
                      </div>
                      <Slider
                        value={[selectedElement.opacity]}
                        min={0.05}
                        max={1}
                        step={0.05}
                        onValueChange={(v) =>
                          updateElement(selectedElement.id, { opacity: v[0] ?? selectedElement.opacity })
                        }
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
    </TooltipProvider>
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

async function fileToText(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(file);
  });
}
