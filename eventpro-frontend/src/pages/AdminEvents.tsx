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
import { Button } from "@/components/ui/button";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Event } from "@/types/api";

const AdminEvents = () => {
  const adminApi = useAdminApi();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!adminApi) return;
    setLoading(true);
    adminApi
      .getEventsPage(page, 10)
      .then((p) => {
        setEvents(p.content);
        setTotalPages(p.totalPages);
      })
      .catch(() => {
        toast({ title: "Failed to load events", variant: "destructive" });
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, [adminApi, page, toast]);

  if (!adminApi) return null;

  const formatDate = (s: string | undefined) => {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleDateString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return s;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">All events</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>Platform events (read-only list).</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground py-8">No events.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Organizer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name || e.title || "—"}</TableCell>
                      <TableCell>{formatDate(e.startTime)}</TableCell>
                      <TableCell>{e.organizerId ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminEvents;
