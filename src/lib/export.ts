import type { Branding, EditorDeck, EditorSlide, TextElement } from "@/lib/editor";

type ExportOptions = {
  background?: string;
  qualityScale?: number;
  jpegQuality?: number;
};

const THUMBS_UP_PATH_1 = "M7 10v12";
const THUMBS_UP_PATH_2 =
  "M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image."));
    img.src = src;
    // Safari sometimes never fires decode; onload is enough.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    img.decode?.().then(() => resolve(img), () => undefined);
  });
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  const roundRect = (ctx as unknown as { roundRect?: (...args: unknown[]) => void }).roundRect;
  if (typeof roundRect === "function") {
    roundRect.call(ctx, x, y, w, h, rr);
    ctx.closePath();
    return;
  }
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = words[0] ?? "";
    for (let i = 1; i < words.length; i++) {
      const w = words[i] ?? "";
      const test = `${line} ${w}`;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
      } else {
        lines.push(line);
        line = w;
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawTextElement(ctx: CanvasRenderingContext2D, el: TextElement) {
  ctx.save();
  ctx.globalAlpha = el.opacity ?? 1;
  ctx.fillStyle = el.color;
  ctx.textBaseline = "top";
  ctx.textAlign = el.align === "center" ? "center" : "left";
  ctx.font = `${el.fontWeight} ${el.fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;

  ctx.beginPath();
  ctx.rect(el.x, el.y, el.w, el.h);
  ctx.clip();

  const lines = wrapTextLines(ctx, el.text, el.w);
  const lineHeight = Math.round(el.fontSize * (el.lineHeight || 1.25));
  const originX = el.align === "center" ? el.x + el.w / 2 : el.x;
  let y = el.y;
  for (const line of lines) {
    if (y + lineHeight > el.y + el.h) break;
    ctx.fillText(line, originX, y);
    y += lineHeight;
  }

  ctx.restore();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawThumbsUp(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  const s = size / 24;
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const p1 = new Path2D(THUMBS_UP_PATH_1);
  const p2 = new Path2D(THUMBS_UP_PATH_2);
  ctx.fill(p2);
  ctx.stroke(p1);
  ctx.stroke(p2);
  ctx.restore();
}

async function renderSlideToCanvas(slide: EditorSlide, branding: Branding, scale: number, isLast: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(slide.format.width * scale);
  canvas.height = Math.round(slide.format.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");

  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Background
  ctx.fillStyle = slide.backgroundColor;
  ctx.fillRect(0, 0, slide.format.width, slide.format.height);

  // Elements
  for (const el of slide.elements) {
    if (el.type === "image") {
      const img = await loadImage(el.src);
      ctx.save();
      ctx.globalAlpha = el.opacity ?? 1;
      roundRectPath(ctx, el.x, el.y, el.w, el.h, 16);
      ctx.clip();
      drawCoverImage(ctx, img, el.x, el.y, el.w, el.h);
      ctx.restore();
      continue;
    }
    drawTextElement(ctx, el as TextElement);
  }

  // Fixed footer (brand)
  const padX = 90;
  const padBottom = 70;
  const avatar = 96;
  const gap = 26;
  const baseY = slide.format.height - padBottom - avatar;

  // avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(padX + avatar / 2, baseY + avatar / 2, avatar / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(padX, baseY, avatar, avatar);
  if (branding.avatarSrc) {
    try {
      const img = await loadImage(branding.avatarSrc);
      drawCoverImage(ctx, img, padX, baseY, avatar, avatar);
    } catch {
      // ignore avatar load failures
    }
  }
  ctx.restore();

  // name/handle
  const textX = padX + avatar + gap;
  ctx.save();
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = branding.nameColor;
  ctx.globalAlpha = 1;
  ctx.font = `500 42px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillText(branding.name, textX, baseY + 8);
  ctx.fillStyle = branding.handleColor;
  ctx.globalAlpha = 0.9;
  ctx.font = `400 30px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillText(branding.handle, textX, baseY + 56);
  ctx.restore();

  // arrow / thumbs-up on last slide
  const arrowSize = 68;
  const arrowX = slide.format.width - padX - arrowSize;
  const arrowY = baseY + 28;
  if (isLast) {
    drawThumbsUp(ctx, arrowX, arrowY, arrowSize, branding.arrowColor);
  } else {
    ctx.save();
    ctx.strokeStyle = branding.arrowColor;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY + arrowSize / 2);
    ctx.lineTo(arrowX + arrowSize, arrowY + arrowSize / 2);
    ctx.moveTo(arrowX + arrowSize, arrowY + arrowSize / 2);
    ctx.lineTo(arrowX + arrowSize - 20, arrowY + arrowSize / 2 - 18);
    ctx.moveTo(arrowX + arrowSize, arrowY + arrowSize / 2);
    ctx.lineTo(arrowX + arrowSize - 20, arrowY + arrowSize / 2 + 18);
    ctx.stroke();
    ctx.restore();
  }

  return canvas;
}

function pickScale(deck: EditorDeck) {
  const totalPixels = deck.slides.reduce((sum, s) => sum + s.format.width * s.format.height, 0);
  // Keep memory reasonable; ~25M pixels at scale 1.
  if (totalPixels <= 6_000_000) return 2;
  if (totalPixels <= 12_000_000) return 1.5;
  return 1;
}

export async function exportDeckToPdfBlob(deck: EditorDeck, branding: Branding, opts?: ExportOptions) {
  const qualityScale = opts?.qualityScale ?? pickScale(deck);
  const jpegQuality = opts?.jpegQuality ?? 0.92;

  const slides: Array<{
    jpegBytes: Uint8Array;
    pageW: number;
    pageH: number;
    imgW: number;
    imgH: number;
  }> = [];

  for (let idx = 0; idx < deck.slides.length; idx++) {
    const slide = deck.slides[idx]!;
    const canvas = await renderSlideToCanvas(slide, branding, qualityScale, idx === deck.slides.length - 1);
    const dataUrl = canvas.toDataURL("image/jpeg", jpegQuality);
    const bytes = new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());
    slides.push({
      jpegBytes: bytes,
      pageW: slide.format.width,
      pageH: slide.format.height,
      imgW: canvas.width,
      imgH: canvas.height,
    });
  }

  const pdfBytes = buildPdfFromJpegs(slides);
  return new Blob([pdfBytes], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function buildPdfFromJpegs(
  slides: Array<{ jpegBytes: Uint8Array; pageW: number; pageH: number; imgW: number; imgH: number }>,
) {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];

  const offsets: number[] = [0]; // object 0
  let cursor = 0;

  function pushBytes(b: Uint8Array) {
    parts.push(b);
    cursor += b.byteLength;
  }
  function pushStr(s: string) {
    pushBytes(enc.encode(s));
  }

  const header = "%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n";
  pushStr(header);

  const objCount =
    2 + // catalog + pages
    slides.length * 3; // per slide: page + contents + image

  let nextId = 1;
  const catalogId = nextId++;
  const pagesId = nextId++;

  const pageIds: number[] = [];
  const contentIds: number[] = [];
  const imageIds: number[] = [];

  for (let i = 0; i < slides.length; i++) {
    pageIds.push(nextId++);
    contentIds.push(nextId++);
    imageIds.push(nextId++);
  }

  // Catalog
  offsets[catalogId] = cursor;
  pushStr(`${catalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj\n`);

  // Pages tree (Kids filled now)
  offsets[pagesId] = cursor;
  pushStr(
    `${pagesId} 0 obj\n<< /Type /Pages /Count ${slides.length} /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] >>\nendobj\n`,
  );

  // Per-slide objects
  for (let i = 0; i < slides.length; i++) {
    const { jpegBytes, pageW, pageH, imgW, imgH } = slides[i]!;
    const pageId = pageIds[i]!;
    const contentId = contentIds[i]!;
    const imageId = imageIds[i]!;

    const imName = `Im${i + 1}`;

    // Image XObject
    offsets[imageId] = cursor;
    pushStr(`${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} `);
    pushStr(`/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.byteLength} >>\n`);
    pushStr("stream\n");
    pushBytes(jpegBytes);
    pushStr("\nendstream\nendobj\n");

    // Content stream draws image full-bleed to MediaBox size
    const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/${imName} Do\nQ\n`;
    const contentBytes = enc.encode(content);
    offsets[contentId] = cursor;
    pushStr(`${contentId} 0 obj\n<< /Length ${contentBytes.byteLength} >>\nstream\n`);
    pushBytes(contentBytes);
    pushStr("endstream\nendobj\n");

    // Page
    offsets[pageId] = cursor;
    pushStr(
      `${pageId} 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
        `/Resources << /XObject << /${imName} ${imageId} 0 R >> /ProcSet [/PDF /ImageC] >> ` +
        `/Contents ${contentId} 0 R >>\nendobj\n`,
    );
  }

  // xref
  const xrefStart = cursor;
  pushStr(`xref\n0 ${objCount + 1}\n`);
  pushStr("0000000000 65535 f \n");
  for (let i = 1; i <= objCount; i++) {
    const off = offsets[i] ?? 0;
    pushStr(`${String(off).padStart(10, "0")} 00000 n \n`);
  }

  pushStr(`trailer\n<< /Size ${objCount + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  return concat(parts);
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((n, p) => n + p.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.byteLength;
  }
  return out;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return c;
    }
  });
}
