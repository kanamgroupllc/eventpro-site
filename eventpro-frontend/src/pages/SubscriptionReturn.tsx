import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";

/**
 * Stripe redirects here after subscription checkout. We sync tier/role from Stripe
 * and redirect to Profile. When from=app (mobile), redirect to app deep link so the app opens and syncs.
 */
const SubscriptionReturn = () => {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"syncing" | "done" | "error">("syncing");

  useEffect(() => {
    if (searchParams.get("from") === "app") {
      window.location.href = "eventpro://subscription/return";
      return;
    }
    let cancelled = false;
    apiService
      .syncSubscriptionFromStripe()
      .then(({ message }) => {
        if (cancelled) return;
        setStatus("done");
        refreshUser();
        if (message.toLowerCase().includes("synced") || message.toLowerCase().includes("tier=")) {
          toast.success("Subscription updated. You now have organizer access.");
        } else {
          toast.info(message);
        }
        navigate("/profile", { replace: true });
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        toast.error("Could not sync subscription. Your payment may still have gone through.");
        navigate("/profile", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, refreshUser, navigate]);

  return (
    <PageShell>
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-6 py-16">
        <div className="rounded-2xl border border-border/60 bg-card/95 px-8 py-10 shadow-[0_20px_40px_rgba(10,10,10,0.08)] text-center max-w-md w-full">
          {status === "syncing" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
              <h1 className="font-headline text-xl tracking-tight text-foreground mb-2">Setting up your account</h1>
              <p className="text-muted-foreground text-sm">Syncing your subscription…</p>
            </>
          )}
          {status === "done" && (
            <>
              <h1 className="font-headline text-xl tracking-tight text-foreground mb-2">Almost there</h1>
              <p className="text-muted-foreground text-sm">Redirecting to your profile…</p>
            </>
          )}
          {status === "error" && (
            <>
              <h1 className="font-headline text-xl tracking-tight text-foreground mb-2">Taking you back</h1>
              <p className="text-muted-foreground text-sm">Redirecting to your profile…</p>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default SubscriptionReturn;
