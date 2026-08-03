import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { apiService } from "@/lib/api";

export interface BillingDetailsForStripe {
  state?: string;
  country?: string;
}

export interface CheckoutPaymentFormProps {
  clientSecret: string;
  onSuccess: (orderId: string) => void;
  onError: (message: string) => void;
  guestConfirm?: (paymentIntentId: string) => Promise<{ id: string }>;
  authenticatedConfirm?: (paymentIntentId: string) => Promise<{ id: string }>;
  isGuest: boolean;
  /** Billing address from checkout form; sent to Stripe so it can validate with the payment method. */
  billingDetails?: BillingDetailsForStripe;
  /** Fired when payment is being confirmed (Stripe + order finalize). */
  onProcessingChange?: (processing: boolean) => void;
}

function StripeNotConfigured() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment</CardTitle>
        <CardDescription>
          Set STRIPE_PUBLISHABLE_KEY in your backend .env (project root) to enable Stripe payments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Restart the backend after updating .env, then refresh this page.
        </p>
      </CardContent>
    </Card>
  );
}

function CheckoutPaymentElementForm({
  clientSecret,
  onSuccess,
  onError,
  guestConfirm,
  authenticatedConfirm,
  isGuest,
  billingDetails,
  onProcessingChange,
}: CheckoutPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finalizeOrder = async (paymentIntentId: string) => {
    if (isGuest && guestConfirm) {
      const order = await guestConfirm(paymentIntentId);
      onSuccess(order.id);
      return;
    }
    if (!isGuest && authenticatedConfirm) {
      const order = await authenticatedConfirm(paymentIntentId);
      onSuccess(order.id);
      return;
    }
    onSuccess(paymentIntentId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      onError("Payment form not ready");
      return;
    }

    setIsSubmitting(true);
    onProcessingChange?.(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message ?? "Payment details are incomplete");
        return;
      }

      const confirmParams: Parameters<typeof stripe.confirmPayment>[0]["confirmParams"] = {
        return_url: `${window.location.origin}/checkout`,
      };

      if (billingDetails?.state || billingDetails?.country) {
        confirmParams.payment_method_data = {
          billing_details: {
            address: {
              ...(billingDetails.state && { state: billingDetails.state }),
              ...(billingDetails.country && { country: billingDetails.country }),
            },
          },
        };
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams,
        redirect: "if_required",
      });

      if (confirmError) {
        onError(confirmError.message ?? "Payment failed");
        return;
      }

      if (paymentIntent?.status === "succeeded" && paymentIntent.id) {
        await finalizeOrder(paymentIntent.id);
      } else if (paymentIntent?.status === "processing") {
        onError("Payment is still processing. Please wait a moment and check your order status.");
      } else {
        onError("Payment did not succeed");
      }
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setIsSubmitting(false);
      onProcessingChange?.(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border-2 border-white/20 bg-background/80 p-4 transition-all duration-200 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(147,51,234,0.4),0_0_20px_rgba(147,51,234,0.2)]">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span>Payment data is secured by Stripe and never stored on our servers.</span>
      </div>
      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-primary via-primary to-orange-500 text-white border-0 shadow-lg hover:shadow-[0_0_20px_hsl(var(--primary)_/_0.4)] h-12 text-base font-semibold"
        size="lg"
        disabled={!stripe || !elements || isSubmitting}
      >
        <ShieldCheck className="h-4 w-4 mr-2" />
        {isSubmitting ? "Processing..." : "Pay now - Secured by Stripe"}
      </Button>
    </form>
  );
}

export function CheckoutPaymentForm(props: CheckoutPaymentFormProps) {
  const { clientSecret } = props;
  const [stripeKey, setStripeKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const envKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim?.();
    if (envKey) {
      setStripeKey(envKey);
      return;
    }
    apiService
      .getPaymentConfig()
      .then((config) => {
        const k = config?.stripePublishableKey?.trim?.();
        setStripeKey(k || null);
        if (!k) setError("no-key");
      })
      .catch(() => setError("no-key"));
  }, []);

  const stripePromise = useMemo(() => (stripeKey ? loadStripe(stripeKey) : null), [stripeKey]);

  const options = useMemo<StripeElementsOptions>(
    () => ({
      clientSecret,
      appearance: {
        theme: "night",
        variables: {
          colorPrimary: "#7c3aed",
          colorBackground: "#111827",
          colorText: "#f9fafb",
          colorDanger: "#ef4444",
          borderRadius: "12px",
          fontFamily: "Inter, system-ui, sans-serif",
        },
      },
    }),
    [clientSecret]
  );

  if (stripeKey === null && !error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Loading Stripe payment form...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !stripeKey || !stripePromise) {
    return <StripeNotConfigured />;
  }

  return (
    <Elements key={clientSecret} stripe={stripePromise} options={options}>
      <CheckoutPaymentElementForm {...props} />
    </Elements>
  );
}
