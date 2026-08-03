import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const AdminSubscriptionPayments = () => {
  const adminApi = useAdminApi();
  const { toast } = useToast();
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [tier, setTier] = useState<"PRO" | "ENTERPRISE">("PRO");
  const [period, setPeriod] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminApi) return;
    const amt = parseFloat(amount);
    if (!userId.trim() || Number.isNaN(amt) || amt < 0) {
      toast({ title: "Enter a valid user ID and amount", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.recordSubscriptionPayment({
        userId: userId.trim(),
        amount: amt,
        tier,
        period,
      });
      toast({ title: "Subscription payment recorded" });
      setAmount("");
    } catch {
      toast({ title: "Failed to record payment", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!adminApi) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Record offline subscription payment</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record offline payment</CardTitle>
          <CardDescription>
            For invoice, wire, or manual grants only. Normal subscriptions are recorded automatically via Stripe when users upgrade on the Pricing page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sub-userId">User ID (UUID)</Label>
              <Input
                id="sub-userId"
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-amount">Amount ($)</Label>
              <Input
                id="sub-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tier</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={tier}
                onChange={(e) => setTier(e.target.value as "PRO" | "ENTERPRISE")}
              >
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={period}
                onChange={(e) => setPeriod(e.target.value as "MONTHLY" | "YEARLY")}
              >
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording…
                </>
              ) : (
                "Record payment"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminSubscriptionPayments;
