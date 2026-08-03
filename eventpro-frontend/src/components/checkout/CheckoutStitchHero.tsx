import { MapPin } from "lucide-react";
import { getEventImageUrl } from "@/lib/utils";

interface CheckoutStitchHeroProps {
  eventName: string;
  location?: string;
  imageUrl?: string | null;
  badge?: string;
}

export function CheckoutStitchHero({
  eventName,
  location,
  imageUrl,
  badge = "LIVE TOUR 2024",
}: CheckoutStitchHeroProps) {
  const src = getEventImageUrl(imageUrl ?? undefined) ?? undefined;

  return (
    <div className="rounded-3xl overflow-hidden border border-border/50 shadow-lg bg-card">
      <div className="relative aspect-[21/9] min-h-[140px] sm:min-h-[180px]">
        {src ? (
          <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary/80 to-primary-glow" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <span className="inline-block rounded-full bg-accent-pink/90 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 mb-2">
            {badge}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold font-headline text-white leading-tight drop-shadow-sm">
            {eventName}
          </h2>
          {location && (
            <p className="text-sm text-white/90 mt-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {location}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
