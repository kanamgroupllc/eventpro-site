import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket, Zap } from "lucide-react";
import { apiService } from "@/lib/api";
import type { RecentSale } from "@/types/api";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

const tileBase =
  "rounded-xl border border-white/10 bg-[rgba(255,255,255,0.05)] backdrop-blur-[12px] p-5 transition-all duration-300";

const FEED_LIMIT = 15;
const POLL_MS = 20_000;

export function LiveTicketFeed() {
  const [sales, setSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSales = useCallback(async () => {
    try {
      const data = await apiService.getOrganizerRecentSales(FEED_LIMIT);
      setSales(data);
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    const t = setInterval(fetchSales, POLL_MS);
    return () => clearInterval(t);
  }, [fetchSales]);

  return (
    <div className={tileBase}>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shadow-[0_0_12px_rgba(147,51,234,0.25)]">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-semibold">Live Ticket Feed</h3>
      </div>
      <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
        {loading ? (
          <Skeleton className="h-12 w-full rounded-lg bg-white/10" />
        ) : sales.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent sales. New purchases will appear here.</p>
        ) : (
          <AnimatePresence initial={false}>
            {sales.map((sale, i) => (
              <motion.div
                key={sale.orderId + sale.soldAt}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/5 border border-white/5 hover:border-primary/20 hover:shadow-[0_0_12px_rgba(147,51,234,0.15)] transition-all"
              >
                <Ticket className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    <span className="text-primary">{sale.buyerName}</span>
                    {" bought "}
                    <span className="tabular-nums">{sale.quantity}</span>
                    {" "}
                    {sale.ticketTypeName}
                    {sale.quantity > 1 ? " tickets" : " ticket"}
                    {" for "}
                    <span className="text-muted-foreground truncate">{sale.eventName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(sale.soldAt), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
