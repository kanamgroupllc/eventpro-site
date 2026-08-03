import { Loader2 } from "lucide-react";
import { getEventImageUrl } from "@/lib/utils";

interface CheckoutPaymentProcessingOverlayProps {
  eventName: string;
  categoryLabel?: string;
  dateLine?: string;
  imageUrl?: string | null;
  lineItems: { label: string; amount: number }[];
  total: number;
}

export function CheckoutPaymentProcessingOverlay({
  eventName,
  categoryLabel = "Electronic / Festival",
  dateLine,
  imageUrl,
  lineItems,
  total,
}: CheckoutPaymentProcessingOverlayProps) {
  const src = getEventImageUrl(imageUrl ?? undefined);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <span className="w-8" />
        <h2 className="font-bold font-headline text-foreground">Secure checkout</h2>
        <span className="text-xs font-bold tracking-widest text-primary">KanamEvents</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
        <div className="h-20 w-20 rounded-full bg-primary/15 flex items-center justify-center mb-6">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
        <h3 className="text-xl font-bold font-headline text-foreground">Processing your payment…</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          Please don&apos;t close the app or refresh the page. We&apos;re finalizing your tickets.
        </p>
      </div>

      <div className="px-4 pb-8 max-w-md mx-auto w-full">
        <div className="rounded-2xl border border-border/50 bg-card shadow-lg overflow-hidden">
          <div className="relative h-28 bg-muted">
            {src ? (
              <img src={src} alt="" className="w-full h-full object-cover opacity-90" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/60 to-slate-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          </div>
          <div className="p-4 space-y-3">
            <span className="inline-block rounded-full bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
              {categoryLabel}
            </span>
            <h4 className="font-bold font-headline text-lg leading-tight">{eventName}</h4>
            {dateLine && <p className="text-xs text-muted-foreground">{dateLine}</p>}
            <div className="rounded-xl bg-primary/[0.06] border border-primary/10 p-3 space-y-2 text-sm">
              {lineItems.map((row) => (
                <div key={row.label} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium tabular-nums">${row.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 pt-2 border-t border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total charge</span>
              <span className="text-2xl font-bold font-headline text-primary tabular-nums">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-4 flex items-center justify-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border border-muted-foreground/50" />
          Encrypted secure transaction
        </p>
      </div>
    </div>
  );
}
