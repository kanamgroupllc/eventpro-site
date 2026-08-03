import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiService } from "@/lib/api";
import type { UserNotification } from "@/types/api";
import { Bell, Check, Loader2, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { PageShell } from "@/components/PageShell";

const PAGE_SIZE = 20;

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPage = async (pageNum: number, append: boolean) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await apiService.getMyNotifications(pageNum, PAGE_SIZE);
      setTotalPages(res.totalPages ?? 1);
      if (append) {
        setNotifications((prev) => [...prev, ...(res.content ?? [])]);
      } else {
        setNotifications(res.content ?? []);
      }
    } catch {
      if (!append) setNotifications([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPage(0, false);
  }, []);

  const loadMore = () => {
    const next = page + 1;
    if (next >= totalPages) return;
    setPage(next);
    loadPage(next, true);
  };

  const markAsRead = async (id: string) => {
    try {
      await apiService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, status: "READ" as const, readAt: new Date().toISOString() } : n
        )
      );
    } catch {
      // ignore
    }
  };

  const hasMore = page + 1 < totalPages;

  return (
    <PageShell>
      <div className="container mx-auto px-4 max-w-2xl py-8 md:py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold font-headline tracking-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
          </h1>
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings#notifications" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Preferences
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="rounded-2xl border-border/60 shadow-[0_20px_40px_rgba(10,10,10,0.06)]">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No notifications yet</p>
              <p className="text-sm mt-1">When you get order confirmations and other updates, they’ll show up here.</p>
            </CardContent>
          </Card>
        ) : (
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {notifications.map((n) => (
              <li key={n.id}>
                <Card
                  className={`cursor-pointer transition-colors hover:bg-secondary/30 ${
                    n.status === "UNREAD" ? "border-primary/40 bg-primary/5" : ""
                  }`}
                  onClick={() => n.status === "UNREAD" && markAsRead(n.id)}
                >
                  <CardContent className="py-4 flex gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{formatTime(n.createdAt)}</p>
                    </div>
                    {n.status === "UNREAD" && (
                      <span className="shrink-0 text-primary" title="Mark as read">
                        <Check className="h-5 w-5" />
                      </span>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </motion.ul>
        )}

        {!loading && hasMore && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Load more
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default Notifications;
