import type React from "react";
import { useMemo, useRef } from "react";
import { ArrowRight, ThumbsUp, User } from "lucide-react";
import type { Branding, EditorSlide, SlideElement } from "@/lib/editor";
import { clamp } from "@/lib/editor";
import { cn } from "@/lib/utils";

export function SlideCanvas({
  slide,
  index,
  isLast = false,
  branding,
  widthPx,
  interactive = true,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  className,
}: {
  slide: EditorSlide;
  index: number;
  isLast?: boolean;
  branding: Branding;
  widthPx: number;
  interactive?: boolean;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, patch: Partial<SlideElement>) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scale = widthPx / slide.format.width;
  const heightPx = Math.round(slide.format.height * scale);

  const styles = useMemo(
    () => ({
      width: `${widthPx}px`,
      height: `${heightPx}px`,
      background: slide.backgroundColor,
    }),
    [widthPx, heightPx, slide.backgroundColor],
  );

  function clientToSlidePoint(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;
    return { x, y };
  }

  function onPointerDownElement(e: React.PointerEvent, el: SlideElement) {
    e.stopPropagation();
    onSelectElement(el.id);
    const start = clientToSlidePoint(e.clientX, e.clientY);
    if (!start) return;

    const startX = start.x;
    const startY = start.y;
    const originX = el.x;
    const originY = el.y;

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const pt = clientToSlidePoint(ev.clientX, ev.clientY);
      if (!pt) return;
      const dx = pt.x - startX;
      const dy = pt.y - startY;

      const elW = el.w;
      const elH = el.h;
      const maxX = slide.format.width - elW;
      const maxY = slide.format.height - elH;

      onUpdateElement(el.id, {
        x: clamp(originX + dx, 0, Math.max(0, maxX)),
        y: clamp(originY + dy, 0, Math.max(0, maxY)),
      } as Partial<SlideElement>);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card shadow-panel select-none",
        className,
      )}
      style={styles}
      onPointerDown={interactive ? () => onSelectElement(null) : undefined}
      role="application"
      aria-label={`Slide canvas ${index + 1}`}
    >
      <div className="pointer-events-none absolute left-3 top-2 text-xs text-muted-foreground">
        {index + 1}
      </div>

      <div className={cn("absolute inset-0", interactive ? "" : "pointer-events-none")}>
        {slide.elements.map((el) => {
          if (el.type === "image") {
            const isSel = selectedElementId === el.id;
            return (
              <div
                key={el.id}
                className={cn(
                  "absolute rounded-lg",
                  isSel ? "ring-2 ring-ring" : "ring-1 ring-border/30",
                )}
                style={{
                  left: el.x * scale,
                  top: el.y * scale,
                  width: el.w * scale,
                  height: el.h * scale,
                  opacity: el.opacity,
                  background: "rgba(255,255,255,0.03)",
                }}
                onPointerDown={interactive ? (e) => onPointerDownElement(e, el) : undefined}
              >
                <img
                  src={el.src}
                  alt=""
                  draggable={false}
                  className="h-full w-full rounded-lg object-cover"
                />
              </div>
            );
          }

          const isSel = selectedElementId === el.id;
          return (
            <div
              key={el.id}
              className={cn("absolute", isSel ? "ring-2 ring-ring rounded-md" : "")}
              style={{
                left: el.x * scale,
                top: el.y * scale,
                width: el.w * scale,
                height: el.h * scale,
                color: el.color,
                fontSize: el.fontSize * scale,
                fontWeight: el.fontWeight,
                lineHeight: el.lineHeight ?? 1.25,
                textAlign: el.align,
                opacity: el.opacity,
                whiteSpace: "pre-line",
                overflow: "hidden",
              }}
              onPointerDown={interactive ? (e) => onPointerDownElement(e, el) : undefined}
            >
              {el.text}
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0">
        <div className="flex items-end justify-between px-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border/50">
              {branding.avatarSrc ? (
                <img src={branding.avatarSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="leading-tight">
              <div className="text-[20px] font-medium" style={{ color: branding.nameColor }}>
                {branding.name}
              </div>
              <div className="text-[15px]" style={{ color: branding.handleColor, opacity: 0.9 }}>
                {branding.handle}
              </div>
            </div>
          </div>
          {isLast ? (
            <ThumbsUp
              className="h-8 w-8"
              color={branding.arrowColor}
              fill={branding.arrowColor}
              strokeWidth={2}
            />
          ) : (
            <ArrowRight className="h-8 w-8" style={{ color: branding.arrowColor }} />
          )}
        </div>
      </div>
    </div>
  );
}
