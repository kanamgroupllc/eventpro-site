import { useEffect, useMemo, useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VenueAddressMapPreviewProps {
  venue?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  className?: string;
}

function buildAddressQuery(parts: VenueAddressMapPreviewProps): string {
  return [parts.venue, parts.street, parts.city, parts.state, parts.zipCode, parts.country]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
}

/** Live map preview for event venue address (OpenStreetMap embed, no API key). */
export function VenueAddressMapPreview({
  venue,
  street,
  city,
  state,
  zipCode,
  country,
  className,
}: VenueAddressMapPreviewProps) {
  const query = useMemo(
    () => buildAddressQuery({ venue, street, city, state, zipCode, country }),
    [venue, street, city, state, zipCode, country]
  );
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || query.length < 5) {
      setEmbedUrl(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error("Geocoding failed");
        const results = (await res.json()) as { lat: string; lon: string }[];
        if (cancelled) return;
        if (!results?.length) {
          setEmbedUrl(null);
          setError("Address not found — check street, city, and state.");
          return;
        }
        const { lat, lon } = results[0];
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        const pad = 0.012;
        const bbox = [lonNum - pad, latNum - pad, lonNum + pad, latNum + pad].join("%2C");
        setEmbedUrl(
          `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`
        );
      } catch {
        if (!cancelled) {
          setEmbedUrl(null);
          setError("Could not load map preview.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const mapsLink = query
    ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`
    : null;

  if (!query) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border/80 bg-muted/30 aspect-[2/1] max-h-48 flex items-center justify-center text-center text-sm text-muted-foreground px-4",
          className
        )}
      >
        Enter a venue address above to preview the map.
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border/80 overflow-hidden bg-muted/20", className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/60 bg-background/80">
        <div className="flex items-center gap-2 min-w-0 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate">{query}</span>
        </div>
        {mapsLink && (
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
          >
            Open map
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="relative aspect-[2/1] max-h-48 bg-muted/40">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Loading map…
          </div>
        )}
        {!loading && embedUrl && (
          <iframe
            title="Venue map preview"
            src={embedUrl}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
          />
        )}
        {!loading && !embedUrl && (
          <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-muted-foreground px-4">
            {error ?? "Enter more address details to locate the venue."}
          </div>
        )}
      </div>
    </div>
  );
}
