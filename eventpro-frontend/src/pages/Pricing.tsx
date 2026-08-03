import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Check, 
  Zap, 
  Building2, 
  Rocket, 
  Users, 
  Globe, 
  BarChart3, 
  Palette, 
  Download, 
  Headphones,
  CreditCard,
  Shield,
  Clock,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/lib/api";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null);
  const [syncingPlan, setSyncingPlan] = useState(false);

  const handleRefreshPlan = async () => {
    if (!user) return;
    try {
      setSyncingPlan(true);
      const { message } = await apiService.syncSubscriptionFromStripe();
      await refreshUser();
      toast.info(message);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not refresh plan.";
      toast.error(msg);
    } finally {
      setSyncingPlan(false);
    }
  };

  const handleUpgrade = async (tier: "PRO" | "ENTERPRISE") => {
    try {
      setUpgradingTier(tier);
      const base = typeof window !== "undefined" ? window.location.origin : "";
      // Enterprise is annual-only; Pro follows the monthly/annual toggle.
      const period = tier === "ENTERPRISE" || isAnnual ? "YEARLY" : "MONTHLY";
      const { url } = await apiService.createSubscriptionCheckoutSession({
        tier,
        period,
        successUrl: `${base}/subscription/return`,
        cancelUrl: `${base}/pricing`,
      });
      if (url) {
        window.location.href = url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Upgrade failed";
      toast.error(msg);
    } finally {
      setUpgradingTier(null);
    }
  };

  const canUpgradeTo = (tierName: string): boolean => {
    const current = (user?.subscriptionTier ?? "BASIC").toUpperCase();
    if (tierName === "Basic") return false;
    if (tierName === "Pro") return current === "BASIC";
    if (tierName === "Enterprise") return current === "BASIC" || current === "PRO";
    return false;
  };

  /** True if the user is already on this tier or a higher one (so we show "Current plan" instead of trial/upgrade CTA). */
  const isCurrentOrHigherTier = (tierName: string): boolean => {
    if (!user) return false;
    const current = (user.subscriptionTier ?? "BASIC").toUpperCase();
    if (tierName === "Basic") return true;
    if (tierName === "Pro") return current === "PRO" || current === "ENTERPRISE";
    if (tierName === "Enterprise") return current === "ENTERPRISE";
    return false;
  };

  const tiers = [
    {
      name: "Basic",
      description: "Perfect for community organizers just getting started",
      monthlyPrice: 0,
      annualPrice: 0,
      transactionFee: "3.5% + $0.99",
      popular: false,
      icon: Users,
      features: [
        { text: "Branded event pages", included: true },
        { text: "Basic color theming", included: true },
        { text: "Attendee data export (CSV)", included: true },
        { text: "QR code tickets", included: true },
        { text: "Guest checkout support", included: true },
        { text: "Standard payout (T+2 after event)", included: true },
        { text: "Email support", included: true },
        { text: "Custom domain", included: false },
        { text: "Merchandise & add-ons", included: false },
        { text: "Early payouts", included: false },
      ],
      cta: "Get Started Free",
      ctaVariant: "outline" as const,
    },
    {
      name: "Pro",
      description: "For growing organizations with advanced needs",
      monthlyPrice: 99,
      annualPrice: 79,
      transactionFee: "2.9% + $0.79",
      popular: true,
      icon: Rocket,
      features: [
        { text: "Everything in Basic", included: true },
        { text: "Custom domain mapping", included: true },
        { text: "Full HTML/CSS customization", included: true },
        { text: "Merchandise & add-on sales", included: true },
        { text: "50% early payout option", included: true },
        { text: "Advanced analytics dashboard", included: true },
        { text: "Priority email & chat support", included: true },
        { text: "Fundraising thermometers", included: true },
        { text: "Automated marketing segments", included: true },
        { text: "100% instant payouts", included: false },
      ],
      cta: "Start 14-Day Trial",
      ctaVariant: "default" as const,
    },
    {
      name: "Enterprise",
      description: "White-label solution for large organizations",
      monthlyPrice: null,
      annualPrice: 3000,
      transactionFee: "2.5% + $0.49",
      popular: false,
      icon: Building2,
      features: [
        { text: "Everything in Pro", included: true },
        { text: "100% instant payouts", included: true },
        { text: "Full white-label branding", included: true },
        { text: "API access for integrations", included: true },
        { text: "Dedicated account manager", included: true },
        { text: "Custom feature development", included: true },
        { text: "1099-K tax compliance reports", included: true },
        { text: "SLA guarantee (99.9% uptime)", included: true },
        { text: "On-premise hosting option", included: true },
        { text: "Multi-currency support", included: true },
      ],
      cta: "Contact Sales",
      ctaVariant: "outline" as const,
    },
  ];

  const comparisonFeatures = [
    {
      category: "Ticketing",
      features: [
        { name: "Event creation", basic: true, pro: true, enterprise: true },
        { name: "Multiple ticket tiers", basic: "Up to 3", pro: "Unlimited", enterprise: "Unlimited" },
        { name: "QR code tickets", basic: true, pro: true, enterprise: true },
        { name: "Guest checkout", basic: true, pro: true, enterprise: true },
        { name: "Reserved seating", basic: false, pro: true, enterprise: true },
      ],
    },
    {
      category: "Payouts",
      features: [
        { name: "Standard payout (T+2)", basic: true, pro: true, enterprise: true },
        { name: "50% early payout", basic: false, pro: true, enterprise: true },
        { name: "100% instant payout", basic: false, pro: false, enterprise: true },
      ],
    },
    {
      category: "Customization",
      features: [
        { name: "Logo & basic colors", basic: true, pro: true, enterprise: true },
        { name: "Custom domain", basic: false, pro: true, enterprise: true },
        { name: "Full HTML/CSS control", basic: false, pro: true, enterprise: true },
        { name: "White-label (no branding)", basic: false, pro: false, enterprise: true },
      ],
    },
    {
      category: "Revenue Tools",
      features: [
        { name: "Merchandise & add-ons", basic: false, pro: true, enterprise: true },
        { name: "Donations & fundraising", basic: false, pro: true, enterprise: true },
        { name: "Dynamic pricing", basic: false, pro: false, enterprise: true },
      ],
    },
    {
      category: "Support",
      features: [
        { name: "Email support", basic: true, pro: true, enterprise: true },
        { name: "Priority chat support", basic: false, pro: true, enterprise: true },
        { name: "Dedicated account manager", basic: false, pro: false, enterprise: true },
        { name: "Custom SLA", basic: false, pro: false, enterprise: true },
      ],
    },
  ];

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-12 md:py-14">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4">
            <Zap className="h-3 w-3 mr-1" />
            Simple, Transparent Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tight mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Pricing that grows with your community
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Start free and scale as you grow. No hidden fees, no surprises.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <Label 
              htmlFor="billing-toggle" 
              className={!isAnnual ? "font-semibold" : "text-muted-foreground"}
            >
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label 
              htmlFor="billing-toggle" 
              className={isAnnual ? "font-semibold" : "text-muted-foreground"}
            >
              Annual
              <Badge variant="default" className="ml-2 text-xs">
                Save 20%
              </Badge>
            </Label>
          </div>

          {/* Refresh plan: only show for BASIC users who might have subscribed elsewhere or need to sync */}
          {user && (user.subscriptionTier !== "PRO" && user.subscriptionTier !== "ENTERPRISE") && (
            <div className="mt-6 flex flex-col items-center gap-1">
              <p className="text-sm text-muted-foreground">Already subscribed or on trial?</p>
              <Button
                variant="outline"
                size="default"
                onClick={handleRefreshPlan}
                disabled={syncingPlan}
                className="gap-2"
              >
                {syncingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh my plan
              </Button>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
            const isEnterprise = tier.name === "Enterprise";

            return (
              <Card 
                key={tier.name}
                className={`relative flex flex-col ${
                  tier.popular 
                    ? "border-primary shadow-lg shadow-primary/20 scale-105" 
                    : "border-border"
                }`}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <div className={`mx-auto mb-4 p-3 rounded-full ${
                    tier.popular ? "bg-primary/10" : "bg-secondary"
                  }`}>
                    <Icon className={`h-6 w-6 ${tier.popular ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-center mb-6">
                    {isEnterprise ? (
                      <>
                        <div className="text-4xl font-bold">
                          ${(tier.annualPrice || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">per year</div>
                      </>
                    ) : (
                      <>
                        <div className="text-4xl font-bold">
                          ${price}
                          {price > 0 && <span className="text-lg font-normal text-muted-foreground">/mo</span>}
                        </div>
                        {isAnnual && tier.monthlyPrice > 0 && (
                          <div className="text-sm text-muted-foreground">
                            billed annually (${tier.annualPrice * 12}/year)
                          </div>
                        )}
                      </>
                    )}
                    <div className="mt-2 text-sm">
                      <Badge variant="outline" className="font-normal">
                        <CreditCard className="h-3 w-3 mr-1" />
                        {tier.transactionFee} per ticket
                      </Badge>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                          feature.included ? "text-primary" : "text-muted-foreground/30"
                        }`} />
                        <span className={feature.included ? "" : "text-muted-foreground/50 line-through"}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {tier.name !== "Basic" && user && canUpgradeTo(tier.name) ? (
                    <Button
                      className="w-full"
                      variant={tier.ctaVariant}
                      size="lg"
                      disabled={!!upgradingTier}
                      onClick={() => handleUpgrade(tier.name.toUpperCase() as "PRO" | "ENTERPRISE")}
                    >
                      {upgradingTier === tier.name ? "Upgrading…" : tier.name === "Pro" ? "Upgrade to Pro" : "Upgrade to Enterprise"}
                    </Button>
                  ) : tier.name !== "Basic" && user && isCurrentOrHigherTier(tier.name) ? (
                    <Button className="w-full" variant="secondary" size="lg" disabled>
                      Current plan
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      variant={tier.ctaVariant}
                      size="lg"
                      asChild
                    >
                      <Link to={tier.name === "Enterprise" ? "/contact" : "/signup"}>
                        {tier.cta}
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Transaction Fee Comparison */}
        <Card className="max-w-4xl mx-auto mb-16">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Lower Fees Than the Competition
            </CardTitle>
            <CardDescription>
              Compare our transaction fees with major ticketing platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-lg bg-primary/5 border-2 border-primary">
                <div className="font-semibold text-primary mb-1">KanamEvents (Pro)</div>
                <div className="text-2xl font-bold">2.9% + $0.79</div>
                <div className="text-sm text-muted-foreground">+ early payouts included</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-secondary">
                <div className="font-semibold text-muted-foreground mb-1">Eventbrite</div>
                <div className="text-2xl font-bold">3.7% + $1.79</div>
                <div className="text-sm text-muted-foreground">standard processing</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-secondary">
                <div className="font-semibold text-muted-foreground mb-1">Ticketmaster</div>
                <div className="text-2xl font-bold">10-15%</div>
                <div className="text-sm text-muted-foreground">+ facility fees</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Early Payout Highlight */}
        <Card className="max-w-4xl mx-auto mb-16 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="p-4 bg-primary/20 rounded-full">
                <Clock className="h-10 w-10 text-primary" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-2">Early Payouts: Get Your Money Faster</h3>
                <p className="text-muted-foreground mb-4">
                  Unlike other platforms that hold your funds until after the event, KanamEvents offers 
                  early payout options so you can cover venue deposits, artist fees, and marketing costs.
                </p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <Badge variant="secondary" className="text-sm py-1 px-3">
                    <Zap className="h-3 w-3 mr-1" />
                    Pro: 50% upfront
                  </Badge>
                  <Badge variant="default" className="text-sm py-1 px-3">
                    <Zap className="h-3 w-3 mr-1" />
                    Enterprise: 100% instant
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Comparison Table */}
        <div className="max-w-5xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Detailed Feature Comparison</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-semibold">Feature</th>
                      <th className="text-center p-4 font-semibold">Basic</th>
                      <th className="text-center p-4 font-semibold text-primary">Pro</th>
                      <th className="text-center p-4 font-semibold">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((section, sectionIdx) => (
                      <>
                        <tr key={section.category} className="bg-muted/30">
                          <td colSpan={4} className="p-3 font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                            {section.category}
                          </td>
                        </tr>
                        {section.features.map((feature, featureIdx) => (
                          <tr key={`${sectionIdx}-${featureIdx}`} className="border-b last:border-0">
                            <td className="p-4">{feature.name}</td>
                            <td className="p-4 text-center">
                              {typeof feature.basic === "boolean" ? (
                                feature.basic ? (
                                  <Check className="h-5 w-5 text-primary mx-auto" />
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )
                              ) : (
                                <span className="text-sm">{feature.basic}</span>
                              )}
                            </td>
                            <td className="p-4 text-center bg-primary/5">
                              {typeof feature.pro === "boolean" ? (
                                feature.pro ? (
                                  <Check className="h-5 w-5 text-primary mx-auto" />
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )
                              ) : (
                                <span className="text-sm font-medium">{feature.pro}</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              {typeof feature.enterprise === "boolean" ? (
                                feature.enterprise ? (
                                  <Check className="h-5 w-5 text-primary mx-auto" />
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )
                              ) : (
                                <span className="text-sm">{feature.enterprise}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "Who pays the transaction fee?",
                a: "By default, transaction fees are passed on to the ticket buyer (added at checkout). However, you can choose to absorb the fees yourself to show a clean ticket price to your attendees."
              },
              {
                q: "Can I switch plans anytime?",
                a: "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to new features. When downgrading, the change takes effect at the end of your current billing period."
              },
              {
                q: "How do early payouts work?",
                a: "Pro members can request 50% of ticket sales before the event (subject to risk assessment). Enterprise members get 100% instant payouts automatically. This helps cover upfront costs like venue deposits and artist fees."
              },
              {
                q: "Is there a contract or commitment?",
                a: "No long-term contracts required. Monthly plans can be cancelled anytime. Annual plans offer 20% savings and can be cancelled with a prorated refund."
              },
              {
                q: "Do you support refunds and chargebacks?",
                a: "Yes, we handle refund processing and chargeback disputes on your behalf. Refunds are processed within 5-7 business days. Our fraud detection helps minimize chargebacks."
              },
            ].map((faq, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{faq.q}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="max-w-4xl mx-auto text-center bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
          <CardContent className="p-12">
            <h2 className="text-3xl font-bold mb-4">Ready to grow your community events?</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Join thousands of cultural organizations, churches, and community groups 
              already using KanamEvents to sell tickets and build their audience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/signup">
                  Start Free Today
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/contact">
                  <Headphones className="h-4 w-4 mr-2" />
                  Talk to Sales
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
};

export default Pricing;
