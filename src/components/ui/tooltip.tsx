import * as React from "react";
import { cn } from "@/lib/utils";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <span className="relative inline-flex group">{children}</span>;
}

export function TooltipTrigger({
  children,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  return <span className="inline-flex">{children}</span>;
}

export function TooltipContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { sideOffset?: number }) {
  return (
    <span
      className={cn(
        "absolute right-0 top-full z-50 mt-2 hidden rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-panel",
        "group-hover:block",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
