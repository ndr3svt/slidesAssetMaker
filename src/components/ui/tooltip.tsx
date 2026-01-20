import * as React from "react";
import { cn } from "@/lib/utils";

type TooltipCtx = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentRef: React.MutableRefObject<HTMLElement | null>;
};

const Ctx = React.createContext<TooltipCtx | null>(null);

function useTooltipCtx() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("Tooltip components must be used within <Tooltip>.");
  return ctx;
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (triggerRef.current?.contains(t)) return;
      if (contentRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown, { capture: true } as any);
    };
  }, [open]);

  return (
    <Ctx.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      <span className="relative inline-flex">{children}</span>
    </Ctx.Provider>
  );
}

export function TooltipTrigger({
  children,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const { open, setOpen, triggerRef } = useTooltipCtx();

  if (React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      ref: (node: HTMLElement | null) => {
        triggerRef.current = node;
        const r = (child as any).ref;
        if (typeof r === "function") r(node);
        else if (r && typeof r === "object") r.current = node;
      },
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e);
        setOpen(!open);
      },
    });
  }

  return (
    <button
      ref={(node) => {
        triggerRef.current = node;
      }}
      type="button"
      className="inline-flex"
      onClick={() => setOpen(!open)}
    >
      {children}
    </button>
  );
}

export function TooltipContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { sideOffset?: number }) {
  const { open, contentRef } = useTooltipCtx();
  if (!open) return null;
  return (
    <span
      ref={(node) => {
        contentRef.current = node;
      }}
      className={cn(
        "absolute right-0 top-full z-[220] mt-2 block rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-panel",
        "pointer-events-auto",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
