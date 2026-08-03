import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { ChevronRight, Search, ShoppingCart, Tag, User, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { cn } from "@/lib/utils";

const categories = [
  { icon: ShoppingCart, title: "Buying", sub: "Tickets & payments", className: "text-indigo-600" },
  { icon: Tag, title: "Selling", sub: "Listings & payouts", className: "text-rose-800" },
  { icon: User, title: "Account", sub: "Security & profile", className: "text-violet-600" },
  { icon: Wallet, title: "Payments", sub: "Refunds & credits", className: "text-indigo-700" },
];

const popular = [
  "How do I transfer my ticket to a friend?",
  "My payment was declined but I was charged",
  "What is the 'Fan-Protect' guarantee?",
];

const Help = () => {
  const [q, setQ] = useState("");

  return (
    <PageShell>
      <div className="container mx-auto max-w-lg px-4 py-8 pb-24">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h1 className="text-3xl font-extrabold font-headline tracking-tight text-foreground leading-tight">
              How can we <span className="italic text-primary font-semibold">help</span> you today?
            </h1>
            <div className="relative mt-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search for FAQs, tickets, or guides…"
                className="pl-12 h-12 rounded-2xl border-border/80 bg-primary/[0.06] focus-visible:ring-primary/25"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-headline text-foreground">Browse categories</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((c) => (
                <Link key={c.title} to="/help#faq" className="block">
                  <Card className="rounded-2xl border-border/60 bg-card/95 hover:border-primary/30 transition-colors h-full">
                    <CardContent className="p-4 flex flex-col gap-2">
                      <c.icon className={cn("h-7 w-7", c.className)} />
                      <p className="font-bold text-foreground">{c.title}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{c.sub}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold font-headline text-foreground">Popular questions</h2>
              <Link to="/help#faq" className="text-sm font-semibold text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {popular.map((p) => (
                <Link key={p} to="/help#faq">
                  <Card className="rounded-2xl border-border/60 bg-card/95 hover:bg-primary/[0.04] transition-colors">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">{p}</span>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <div id="faq" className="scroll-mt-24">
          <Card className="rounded-3xl border-0 bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-lg overflow-hidden">
            <CardContent className="p-8 text-center space-y-4">
              <p className="text-xl font-bold font-headline">Need more help?</p>
              <p className="text-sm text-primary-foreground/90 leading-relaxed">
                Our support team is active 24/7 to help you with your event experience.
              </p>
              <Button asChild variant="secondary" className="rounded-full h-12 px-8 font-semibold bg-background text-primary hover:bg-background/90">
                <Link to="/contact">Contact support</Link>
              </Button>
            </CardContent>
          </Card>
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
};

export default Help;
