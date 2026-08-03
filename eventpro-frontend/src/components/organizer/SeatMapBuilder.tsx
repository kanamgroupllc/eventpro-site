import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Grid3X3, Hand, Layers, Plus, Redo2, Trash2, Undo2, Coins, Minus } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/lib/api";
import type { SeatResponse } from "@/types/api";
import { cn } from "@/lib/utils";

type SectionRow = { name: string; rowCount: number; seatsPerRow: number; price: number };

type Tool = "select" | "section" | "price";

export type SeatMapBuilderProps = {
  eventId: string;
  /** When false, show upgrade / disabled messaging */
  showProFeatures: boolean;
  seatMapSections: SectionRow[];
  setSeatMapSections: React.Dispatch<React.SetStateAction<SectionRow[]>>;
  eventSeats: SeatResponse[];
  setEventSeats: React.Dispatch<React.SetStateAction<SeatResponse[]>>;
  isSeatMapSubmitting: boolean;
  setIsSeatMapSubmitting: (v: boolean) => void;
  /** Larger canvas + nav chrome for standalone /seat-map page */
  variant?: "embedded" | "page";
  /** For deep links from organizer hub, e.g. #section-seat-map */
  id?: string;
  className?: string;
};

/**
 * Stitch-style seat map builder: visual preview + the same section-based API as EventFormNew.
 * The canvas is a capacity preview (dots), not a full vector editor — matching backend createSeatMap(sections).
 */
export function SeatMapBuilder({
  eventId,
  showProFeatures,
  seatMapSections,
  setSeatMapSections,
  eventSeats,
  setEventSeats,
  isSeatMapSubmitting,
  setIsSeatMapSubmitting,
  variant = "embedded",
  id,
  className,
}: SeatMapBuilderProps) {
  const [tool, setTool] = useState<Tool>("select");

  const { previewDots, totalPlanned, tierCount } = useMemo(() => {
    const total = seatMapSections.reduce((acc, s) => acc + Math.max(1, s.rowCount) * Math.max(1, s.seatsPerRow), 0);
    const dots = Math.min(120, Math.max(8, total || 48));
    const named = seatMapSections.filter((s) => s.name?.trim()).length;
    return { previewDots: dots, totalPlanned: total, tierCount: Math.max(1, named) };
  }, [seatMapSections]);

  const selectedDot = Math.min(17, previewDots - 1);

  const handleCreate = async () => {
    const sections = seatMapSections
      .filter((s) => s.name?.trim())
      .map((s) => ({
        name: s.name.trim(),
        rowCount: s.rowCount,
        seatsPerRow: s.seatsPerRow,
        price: s.price,
      }));
    if (sections.length === 0) {
      toast.error("Add at least one section with a name");
      return;
    }
    setIsSeatMapSubmitting(true);
    try {
      const result = await apiService.createEventSeatMap(eventId, { sections });
      toast.success(`Seat map created: ${result.seatsCreated} seats`);
      const seats = await apiService.getEventSeats(eventId);
      setEventSeats(seats);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      toast.error(msg || "Failed to create seat map");
    } finally {
      setIsSeatMapSubmitting(false);
    }
  };

  if (!showProFeatures) {
    return (
      <Card id={id} className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Seat map
          </CardTitle>
          <CardDescription>Reserved seating and seat maps require Pro or Enterprise.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card id={id} className={cn(variant === "page" && "border-primary/15 shadow-lg", className)}>
      <CardHeader className={cn(variant === "page" && "border-b border-border/60 bg-muted/20")}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-heading">
              <Grid3X3 className="h-5 w-5 text-primary" />
              Seat map editor
            </CardTitle>
            <CardDescription className="mt-1.5">
              {eventSeats.length > 0
                ? `${eventSeats.length} seats created. Attendees pick seats on the public event page.`
                : "Define sections (rows × seats per row) and pricing. One click generates all seats via the API."}
            </CardDescription>
            {variant === "embedded" && eventSeats.length === 0 && (
              <Button variant="link" asChild className="mt-2 h-auto p-0 text-sm font-semibold text-primary">
                <Link to={`/organizer/events/${eventId}/seat-map`}>Open full-screen seat map workspace</Link>
              </Button>
            )}
          </div>
          {variant === "page" && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/80 bg-background px-3 py-1 font-semibold uppercase tracking-wide">
                Canvas preview v1
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {eventSeats.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Seat map is set up. Open the event page to see the seating chart, or adjust tiers under Tickets.
          </p>
        ) : (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Tools</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "select" as const, icon: Hand, label: "Selection" },
                  { id: "section" as const, icon: Layers, label: "Sections" },
                  { id: "price" as const, icon: Coins, label: "Pricing" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTool(t.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                    tool === t.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>

            <div
              className={cn(
                "rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4",
                variant === "page" && "min-h-[320px]"
              )}
            >
              <div className="mb-3 flex flex-wrap justify-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-2 shadow-sm">
                <Button type="button" size="icon" variant="secondary" className="h-9 w-9 rounded-lg" disabled title="Zoom (coming soon)">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-lg" disabled title="Zoom (coming soon)">
                  <Minus className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-lg" disabled title="Undo (coming soon)">
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-lg" disabled title="Redo (coming soon)">
                  <Redo2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mx-auto flex max-w-md flex-col items-center rounded-xl border border-border/60 bg-background/60 p-4">
                <div className="mb-3 self-start rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary">
                  {seatMapSections.find((s) => s.name?.trim())?.name?.trim() || "Section"} · Preview
                </div>
                <div className="flex max-w-[280px] flex-wrap justify-center gap-1.5">
                  {Array.from({ length: previewDots }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        i === selectedDot ? "bg-primary ring-2 ring-primary/30" : "bg-primary/35"
                      )}
                    />
                  ))}
                </div>
                <div
                  className="mt-4 flex h-9 w-full max-w-[220px] items-center justify-center rounded-t-[999px] bg-[#1e1b4b] text-[10px] font-extrabold tracking-widest text-indigo-200"
                  style={{ fontVariant: "small-caps" }}
                >
                  Stage
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Planned seats:{" "}
                  <strong className="text-foreground">{totalPlanned.toLocaleString()}</strong>
                </span>
                <span>
                  Preview dots: <strong className="text-foreground">{previewDots}</strong> (capped)
                </span>
                <span>
                  Price tiers in form: <strong className="text-foreground">{tierCount}</strong>
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Section rows</p>
              {seatMapSections.map((section, idx) => (
                <div key={idx} className="flex flex-wrap items-end gap-2 rounded-lg border bg-card/50 p-3">
                  <Input
                    placeholder="Section name (e.g. Orchestra)"
                    value={section.name}
                    onChange={(e) =>
                      setSeatMapSections((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, name: e.target.value } : s))
                      )
                    }
                    className={cn("max-w-[200px]", tool === "section" && "ring-2 ring-primary/25")}
                  />
                  <div className="flex items-center gap-1">
                    <Label className="text-xs whitespace-nowrap">Rows</Label>
                    <Input
                      type="number"
                      min={1}
                      value={section.rowCount}
                      onChange={(e) =>
                        setSeatMapSections((prev) =>
                          prev.map((s, i) =>
                            i === idx ? { ...s, rowCount: Math.max(1, parseInt(e.target.value, 10) || 1) } : s
                          )
                        )
                      }
                      className="w-16"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs whitespace-nowrap">Seats/row</Label>
                    <Input
                      type="number"
                      min={1}
                      value={section.seatsPerRow}
                      onChange={(e) =>
                        setSeatMapSections((prev) =>
                          prev.map((s, i) =>
                            i === idx ? { ...s, seatsPerRow: Math.max(1, parseInt(e.target.value, 10) || 1) } : s
                          )
                        )
                      }
                      className="w-16"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs whitespace-nowrap">Price $</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={section.price}
                      onChange={(e) =>
                        setSeatMapSections((prev) =>
                          prev.map((s, i) =>
                            i === idx ? { ...s, price: parseFloat(e.target.value) || 0 } : s
                          )
                        )
                      }
                      className={cn("w-24", tool === "price" && "ring-2 ring-primary/25")}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSeatMapSections((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={seatMapSections.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setSeatMapSections((prev) => [...prev, { name: "", rowCount: 1, seatsPerRow: 1, price: 0 }])
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Add section
            </Button>

            <Button
              type="button"
              className="w-full bg-gradient-primary sm:w-auto"
              disabled={isSeatMapSubmitting || seatMapSections.some((s) => !s.name?.trim() || s.price < 0)}
              onClick={handleCreate}
            >
              {isSeatMapSubmitting ? "Creating…" : "Create seat map"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
