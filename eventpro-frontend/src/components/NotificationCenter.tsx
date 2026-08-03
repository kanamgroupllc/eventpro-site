import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiService } from "@/lib/api";
import type { UserNotification } from "@/types/api";

const formatTime = (iso: string) => {
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
  return d.toLocaleDateString();
};

export const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiService.getMyNotifications(0, 15);
      setNotifications(res.content ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  const unreadCount = notifications.filter((n) => n.status === "UNREAD").length;

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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1 text-xs bg-accent text-accent-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 max-h-[min(24rem,70vh)] flex flex-col" align="end">
        <div className="p-2 border-b flex items-center justify-between flex-wrap gap-1">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              className="text-xs text-primary hover:underline font-medium"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
            <Link
              to="/settings"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Preferences
            </Link>
          </div>
        </div>
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            <ul className="py-1">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`flex gap-2 px-3 py-2 hover:bg-secondary/50 cursor-pointer border-b border-border/50 last:border-0 ${
                    n.status === "UNREAD" ? "bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    if (n.status === "UNREAD") markAsRead(n.id);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatTime(n.createdAt)}</p>
                  </div>
                  {n.status === "UNREAD" && (
                    <span className="shrink-0 text-primary" title="Mark as read">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
