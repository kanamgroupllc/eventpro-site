import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

export interface Seat {
  id: string;
  row: string;
  number: number;
  section: string;
  price: number;
  status: "available" | "selected" | "sold" | "reserved";
  type: "standard" | "premium" | "vip" | "accessible";
}

interface SeatingMapProps {
  seats: Seat[];
  onSeatSelect?: (seats: Seat[]) => void;
  maxSeats?: number;
  venueName?: string;
  /** Read-only preview (e.g. checkout) — highlights seats without allowing selection */
  readOnly?: boolean;
  highlightedSeatIds?: string[];
}

// Generate sample venue layout
export const generateSampleSeats = (): Seat[] => {
  const seats: Seat[] = [];
  const sections = ["Orchestra", "Mezzanine", "Balcony"];
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  
  sections.forEach((section, sectionIndex) => {
    const sectionRows = rows.slice(0, section === "Orchestra" ? 8 : section === "Mezzanine" ? 6 : 4);
    const seatsPerRow = section === "Orchestra" ? 20 : section === "Mezzanine" ? 16 : 12;
    const basePrice = section === "Orchestra" ? 150 : section === "Mezzanine" ? 100 : 60;
    
    sectionRows.forEach((row, rowIndex) => {
      for (let num = 1; num <= seatsPerRow; num++) {
        const isAisle = num === Math.floor(seatsPerRow / 2) || num === Math.floor(seatsPerRow / 2) + 1;
        const isEdge = num <= 2 || num >= seatsPerRow - 1;
        
        // Randomly mark some seats as sold/reserved
        const random = Math.random();
        let status: Seat["status"] = "available";
        if (random < 0.15) status = "sold";
        else if (random < 0.2) status = "reserved";
        
        // Determine seat type
        let type: Seat["type"] = "standard";
        if (section === "Orchestra" && rowIndex < 2) type = "vip";
        else if (section === "Orchestra" && rowIndex < 4) type = "premium";
        else if (isEdge && section !== "Orchestra") type = "accessible";
        
        const priceMultiplier = type === "vip" ? 2 : type === "premium" ? 1.5 : type === "accessible" ? 0.9 : 1;
        
        seats.push({
          id: `${section}-${row}-${num}`,
          row,
          number: num,
          section,
          price: Math.round(basePrice * priceMultiplier),
          status,
          type,
        });
      }
    });
  });
  
  return seats;
};

const seatTypeColors = {
  standard: "bg-secondary hover:bg-primary/80",
  premium: "bg-amber-500/80 hover:bg-amber-500",
  vip: "bg-purple-500/80 hover:bg-purple-500",
  accessible: "bg-blue-500/80 hover:bg-blue-500",
};

const seatStatusStyles = {
  available: "cursor-pointer",
  selected: "!bg-primary ring-2 ring-primary ring-offset-2 ring-offset-background",
  sold: "!bg-muted-foreground/30 cursor-not-allowed",
  reserved: "!bg-muted-foreground/50 cursor-not-allowed",
};

export const SeatingMap = ({
  seats,
  onSeatSelect,
  maxSeats = 8,
  venueName = "Main Venue",
  readOnly = false,
  highlightedSeatIds = [],
}: SeatingMapProps) => {
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [zoom, setZoom] = useState(1);
  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);
  const highlightedSet = useMemo(() => new Set(highlightedSeatIds), [highlightedSeatIds]);

  // Group seats by section and row
  const seatsBySection = useMemo(() => {
    const grouped: Record<string, Record<string, Seat[]>> = {};
    seats.forEach((seat) => {
      if (!grouped[seat.section]) grouped[seat.section] = {};
      if (!grouped[seat.section][seat.row]) grouped[seat.section][seat.row] = [];
      grouped[seat.section][seat.row].push(seat);
    });
    // Sort seats within each row by number
    Object.values(grouped).forEach((section) => {
      Object.values(section).forEach((row) => {
        row.sort((a, b) => a.number - b.number);
      });
    });
    return grouped;
  }, [seats]);

  const handleSeatClick = (seat: Seat) => {
    if (readOnly) return;
    if (seat.status === "sold" || seat.status === "reserved") return;

    const isSelected = selectedSeats.some((s) => s.id === seat.id);
    
    if (isSelected) {
      const newSelection = selectedSeats.filter((s) => s.id !== seat.id);
      setSelectedSeats(newSelection);
      onSeatSelect?.(newSelection);
    } else if (selectedSeats.length < maxSeats) {
      const newSelection = [...selectedSeats, { ...seat, status: "selected" as const }];
      setSelectedSeats(newSelection);
      onSeatSelect?.(newSelection);
    }
  };

  const getSeatStatus = (seat: Seat): Seat["status"] => {
    if (highlightedSet.has(seat.id) || selectedSeats.some((s) => s.id === seat.id)) return "selected";
    return seat.status;
  };

  const totalPrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

  const resetSelection = () => {
    if (readOnly) return;
    setSelectedSeats([]);
    onSeatSelect?.([]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {readOnly ? "Your seats" : "Select Your Seats"}
            </CardTitle>
            <CardDescription>{venueName}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              disabled={zoom >= 2}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={resetSelection} disabled={readOnly}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-secondary" />
            <span>Standard</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500" />
            <span>Premium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-500" />
            <span>VIP</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span>Accessible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted-foreground/30" />
            <span>Sold</span>
          </div>
        </div>

        {/* Stage */}
        <div className="mb-8">
          <div className="bg-gradient-primary text-primary-foreground text-center py-3 rounded-t-xl font-bold text-lg">
            STAGE
          </div>
          <div className="h-4 bg-gradient-to-b from-primary/20 to-transparent rounded-b-lg" />
        </div>

        {/* Seating Map */}
        <div 
          className="overflow-auto pb-4"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
        >
          {Object.entries(seatsBySection).map(([section, rows]) => (
            <div key={section} className="mb-8">
              <h3 className="text-center font-semibold mb-4 text-muted-foreground">
                {section}
              </h3>
              <div className="space-y-1">
                {Object.entries(rows).map(([row, rowSeats]) => (
                  <div key={row} className="flex items-center justify-center gap-1">
                    <span className="w-6 text-xs text-muted-foreground text-right mr-2">
                      {row}
                    </span>
                    <div className="flex gap-0.5">
                      {rowSeats.map((seat, index) => {
                        const status = getSeatStatus(seat);
                        const isMiddle = index === Math.floor(rowSeats.length / 2) - 1;
                        
                        return (
                          <Tooltip key={seat.id}>
                            <TooltipTrigger asChild>
                              <motion.button
                                whileHover={status === "available" ? { scale: 1.2 } : {}}
                                whileTap={status === "available" ? { scale: 0.9 } : {}}
                                className={`w-5 h-5 rounded-t-md text-[8px] font-medium transition-all ${
                                  seatTypeColors[seat.type]
                                } ${seatStatusStyles[status]} ${isMiddle ? "mr-4" : ""}`}
                                onClick={() => handleSeatClick(seat)}
                                disabled={status === "sold" || status === "reserved"}
                              >
                                {seat.number}
                              </motion.button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-[220px] p-4 text-left"
                            >
                              <div className="space-y-2 text-base">
                                <p className="font-semibold text-base leading-tight">
                                  {section} — Row {seat.row}, Seat {seat.number}
                                </p>
                                <p className="text-muted-foreground capitalize text-sm">
                                  {seat.type} • ${seat.price.toFixed(2)}
                                </p>
                                {status === "sold" && (
                                  <p className="text-destructive font-medium text-sm">Sold Out</p>
                                )}
                                {status === "reserved" && (
                                  <p className="text-amber-500 font-medium text-sm">Reserved</p>
                                )}
                                {status === "available" && (
                                  <p className="text-green-600 dark:text-green-400 text-sm">Available</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                    <span className="w-6 text-xs text-muted-foreground ml-2">
                      {row}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Selection Summary */}
        {selectedSeats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-secondary/50 rounded-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold">
                Selected Seats ({selectedSeats.length}/{maxSeats})
              </span>
              <Button variant="ghost" size="sm" onClick={resetSelection}>
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedSeats.map((seat) => (
                <Badge
                  key={seat.id}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleSeatClick(seat)}
                >
                  {seat.section} {seat.row}{seat.number} - ${seat.price}
                </Badge>
              ))}
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-muted-foreground">Total:</span>
              <span className="text-xl font-bold">${totalPrice.toFixed(2)}</span>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
