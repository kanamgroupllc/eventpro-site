import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { User, Ticket } from "lucide-react";
import { apiService } from "@/lib/api";
import type { FollowedOrganizer } from "@/types/api";
import { PageShell } from "@/components/PageShell";

const Following = () => {
  const [list, setList] = useState<FollowedOrganizer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService
      .getFollowing()
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-[40vh] items-center justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="container mx-auto px-4 max-w-2xl py-8 md:py-10">
        <h1 className="text-3xl md:text-4xl font-extrabold font-headline tracking-tight mb-6 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Following
        </h1>
        <p className="text-muted-foreground mb-6">
          Organizers you follow. Visit their events from event pages.
        </p>
        {list.length === 0 ? (
          <Card className="p-8 text-center rounded-2xl border-border/60 shadow-[0_20px_40px_rgba(10,10,10,0.06)]">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">You aren’t following any organizers yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Go to an event and click <strong>Follow</strong> next to the organizer.
            </p>
            <Link to="/events" className="inline-block mt-4 text-primary font-medium hover:underline">
              Discover events →
            </Link>
          </Card>
        ) : (
          <ul className="space-y-3">
            {list.map((o) => (
              <li key={o.organizerId}>
                <Link
                  to={`/events?organizerId=${o.organizerId}`}
                  className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  {o.profilePictureUrl ? (
                    <img
                      src={o.profilePictureUrl}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover bg-muted"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-foreground">
                      {[o.firstName, o.lastName].filter(Boolean).join(" ") || "Organizer"}
                    </span>
                  </div>
                  <Ticket className="h-5 w-5 text-muted-foreground shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
};

export default Following;
