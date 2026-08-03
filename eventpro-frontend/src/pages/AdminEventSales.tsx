import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { EventSales } from "@/types/api";

const AdminEventSales = () => {
  const adminApi = useAdminApi();
  const { toast } = useToast();
  const [sales, setSales] = useState<EventSales[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminApi) return;
    adminApi
      .getEventSales()
      .then(setSales)
      .catch(() => {
        toast({ title: "Failed to load event sales", variant: "destructive" });
        setSales([]);
      })
      .finally(() => setLoading(false));
  }, [adminApi, toast]);

  if (!adminApi) return null;

  const totalRevenue = sales.reduce((s, e) => s + (e.revenue ?? 0), 0);
  const totalTickets = sales.reduce((s, e) => s + (e.ticketsSold ?? 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <TrendingUp className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Event sales</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales by event</CardTitle>
          <CardDescription>
            Tickets sold and revenue per event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : sales.length === 0 ? (
            <p className="text-muted-foreground py-8">No event sales data.</p>
          ) : (
            <>
              <div className="flex gap-4 mb-4 text-sm">
                <span className="text-muted-foreground">
                  Total revenue: <strong>${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </span>
                <span className="text-muted-foreground">
                  Total tickets: <strong>{totalTickets.toLocaleString()}</strong>
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead className="text-right">Tickets sold</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Total capacity</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((e) => (
                    <TableRow key={e.eventId}>
                      <TableCell className="font-medium">{e.eventName || "—"}</TableCell>
                      <TableCell className="text-right">{e.ticketsSold?.toLocaleString() ?? "—"}</TableCell>
                      <TableCell className="text-right">{e.availableTickets?.toLocaleString() ?? "—"}</TableCell>
                      <TableCell className="text-right">{e.totalTickets?.toLocaleString() ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        ${(e.revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminEventSales;
