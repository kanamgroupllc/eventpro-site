import { useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Decorative zoomable grid for checkout (Stitch venue map); not wired to live seat inventory. */
export function CheckoutVenuePreview({ className }: { className?: string }) {
  const [scale, setScale] = useState(1);

  const rows = 5;
  const cols = 10;
  const selected = new Set(["2-4", "2-5"]);

  return (
    <div className={cn("rounded-2xl border border-border/50 bg-primary/[0.04] p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="font-bold font-headline">Venue map</h3>
          <p className="text-xs text-muted-foreground">Section A · Row 12</p>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Selected
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/30" /> Available
          </span>
        </div>
      </div>

      <div className="relative rounded-xl bg-background border border-border/60 overflow-hidden">
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-lg shadow-sm"
            onClick={() => setScale((s) => Math.min(2.2, s + 0.15))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-lg shadow-sm"
            onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>

        <div
          className="overflow-auto max-h-[200px] sm:max-h-[240px] touch-pan-x touch-pan-y"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div
            className="p-6 pb-4 origin-top transition-transform duration-200 ease-out"
            style={{ transform: `scale(${scale})` }}
          >
            <div className="mx-auto w-max rounded-lg bg-muted/40 px-3 py-1 text-[10px] font-semibold text-muted-foreground text-center mb-3">
              STAGE FRONT
            </div>
            <div
              className="grid gap-1 w-max mx-auto"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: rows * cols }).map((_, i) => {
                const r = Math.floor(i / cols);
                const c = i % cols;
                const key = `${r}-${c}`;
                const isSel = selected.has(key);
                return (
                  <div
                    key={key}
                    className={cn(
                      "h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-[3px] transition-colors",
                      isSel ? "bg-primary ring-2 ring-primary/40" : "bg-primary/25"
                    )}
                  />
                );
              })}
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] italic text-muted-foreground py-2 border-t border-border/40">
          Pinch to zoom or drag · Illustrative layout
        </p>
      </div>
    </div>
  );
}
