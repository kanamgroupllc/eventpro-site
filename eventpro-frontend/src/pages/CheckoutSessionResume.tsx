import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiService } from "@/lib/api";
import type { CheckoutSession } from "@/types/api";
import { CheckoutPaymentForm } from "@/components/CheckoutPaymentForm";
import { ReservationCountdown } from "@/components/ReservationCountdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CheckoutSessionResume() {
  const { token = "" } = useParams();
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSession(await apiService.resumeCheckoutSession(token));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout session could not be loaded");
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const finalize = async (paymentIntentId?: string) => {
    if (!session) throw new Error("Checkout session is unavailable");
    const completed = await apiService.finalizeCheckoutSession(session.id, paymentIntentId, token);
    setSession(completed);
    if (completed.status !== "COMPLETED" || !completed.orderId) {
      throw new Error(completed.status === "REFUNDED" || completed.status === "REFUND_PENDING"
        ? "The reservation expired and the payment is being refunded."
        : `Checkout could not be completed (${completed.status}).`);
    }
    return { id: completed.orderId };
  };

  if (error) return <div className="mx-auto max-w-lg p-8 text-center text-destructive">{error}</div>;
  if (!session) return <div className="mx-auto max-w-lg p-8 text-center">Loading secure checkout…</div>;
  if (session.status === "COMPLETED") {
    return <Card className="mx-auto my-12 max-w-lg"><CardHeader><CardTitle>Order confirmed</CardTitle></CardHeader>
      <CardContent>Your order reference is {session.orderId}.</CardContent></Card>;
  }
  if (session.status !== "PENDING") {
    return <Card className="mx-auto my-12 max-w-lg"><CardHeader><CardTitle>Checkout {session.status.toLowerCase()}</CardTitle></CardHeader>
      <CardContent>This checkout can no longer be completed.</CardContent></Card>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-12">
      <ReservationCountdown reservedUntil={session.expiresAt} serverTime={session.serverTime} onExpired={() => void load()} />
      <Card>
        <CardHeader><CardTitle>Secure checkout</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>${Number(session.totalAmount).toFixed(2)}</span></div>
          {session.clientSecret ? (
            <CheckoutPaymentForm
              clientSecret={session.clientSecret}
              isGuest
              guestConfirm={(paymentIntentId) => finalize(paymentIntentId)}
              onSuccess={() => void load()}
              onError={setError}
            />
          ) : (
            <Button className="w-full" onClick={() => void finalize().then(() => load()).catch((e) => setError(e.message))}>
              Complete order
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={() => void apiService.cancelCheckoutSession(session.id, token).then(setSession).catch((e) => setError(e.message))}>
            Cancel checkout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
