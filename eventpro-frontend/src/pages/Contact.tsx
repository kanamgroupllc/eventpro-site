import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "@/components/PageShell";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  HelpCircle,
  Wrench,
  CreditCard,
  Calendar,
  MoreHorizontal,
  Send,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const SUPPORT_EMAIL = "support@kanamevents.com";

type SupportCategory = "technical" | "billing" | "event" | "other";

const CATEGORIES: {
  id: SupportCategory;
  label: string;
  icon: typeof Wrench;
}[] = [
  { id: "technical", label: "Technical issue", icon: Wrench },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "event", label: "Event inquiry", icon: Calendar },
  { id: "other", label: "Other", icon: MoreHorizontal },
];

const Contact = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<SupportCategory>("technical");
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in your name, email, and message.");
      return;
    }
    const catLabel = CATEGORIES.find((c) => c.id === category)?.label ?? category;
    const body = [
      `Name: ${fullName.trim()}`,
      `Email: ${email.trim()}`,
      `Category: ${catLabel}`,
      orderId.trim() ? `Order ID: ${orderId.trim()}` : null,
      "",
      message.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    const subject = encodeURIComponent(`[KanamEvents] ${catLabel}`);
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    toast.success("Opening your email app — send the message to reach support.");
  };

  const handleLiveChat = () => {
    toast.message("Live chat", {
      description: "Connect with support@kanamevents.com or use the form below. Full chat integration coming soon.",
    });
  };

  return (
    <PageShell>
      <div className="container mx-auto max-w-lg px-4 pb-28 pt-4 md:pt-8 md:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-6"
        >
          {/* Header — Stitch Support Center */}
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </Button>
            <span className="font-headline font-bold text-foreground">Support Center</span>
            <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full" asChild>
              <Link to="/help" aria-label="Help">
                <HelpCircle className="h-5 w-5 text-primary" />
              </Link>
            </Button>
          </div>

          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold font-headline tracking-tight text-foreground">
              Contact support
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              We&apos;re here to help. Send us a message and we&apos;ll get back to you as soon as possible.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="support-name">Full name</Label>
              <Input
                id="support-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="rounded-2xl border-border/80 bg-card h-12"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="support-email">Email address</Label>
              <Input
                id="support-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="rounded-2xl border-border/80 bg-card h-12"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map(({ id, label, icon: Icon }) => {
                  const isActive = category === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCategory(id)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 text-center transition-all min-h-[88px]",
                        isActive
                          ? "border-primary bg-primary/12 text-foreground shadow-sm"
                          : "border-border/60 bg-card/80 text-muted-foreground hover:border-primary/40 hover:bg-primary/[0.06]"
                      )}
                    >
                      <Icon className={cn("h-6 w-6", isActive ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-xs font-semibold font-headline leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="support-order">Order ID (optional)</Label>
              <Input
                id="support-order"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="#ORD-12345"
                className="rounded-2xl border-border/80 bg-card h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="support-message">Message</Label>
              <Textarea
                id="support-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help you today?"
                rows={5}
                className="rounded-2xl border-border/80 bg-card resize-none min-h-[140px]"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-2xl font-headline font-bold text-base bg-gradient-to-r from-primary via-primary to-sky-600 hover:opacity-95 shadow-lg gap-2"
            >
              Submit message
              <Send className="h-4 w-4" />
            </Button>
          </form>

          {/* Live chat card */}
          <div className="rounded-3xl bg-primary/[0.08] border border-primary/15 p-4 md:p-5 space-y-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold font-headline text-foreground">Need an instant answer?</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Our support agents are online and ready to help you in real-time.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full h-12 rounded-2xl bg-background border border-border/80 font-headline font-semibold gap-2 shadow-sm"
              onClick={handleLiveChat}
            >
              <MessageCircle className="h-5 w-5 text-primary" />
              Start live chat
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Prefer email only?{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary font-medium underline-offset-2 hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </motion.div>
      </div>
    </PageShell>
  );
};

export default Contact;
