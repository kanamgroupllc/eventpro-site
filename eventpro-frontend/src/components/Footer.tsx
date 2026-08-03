import { useState } from "react";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Mail, Check, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { BrandLogo } from "@/components/BrandLogo";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribeStatus("loading");
    setTimeout(() => {
      setSubscribeStatus("success");
      setEmail("");
    }, 800);
  };

  /** Only routes registered in `App.tsx` — avoids 404s from marketing placeholders. */
  const footerLinks = {
    company: [
      { label: "Home", href: "/" },
      { label: "Browse events", href: "/events" },
      { label: "Partners", href: "/partners" },
    ],
    support: [
      { label: "Help Center", href: "/help" },
      { label: "Contact", href: "/contact" },
    ],
    legal: [{ label: "Privacy Policy", href: "/privacy" }],
    organizers: [
      { label: "Organizer dashboard", href: "/organizer" },
      { label: "Pricing", href: "/pricing" },
      { label: "Partner program", href: "/partners" },
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
    { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
    { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
    { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
    { icon: Youtube, href: "https://youtube.com", label: "YouTube" },
  ];

  return (
    <footer className="bg-secondary/30 border-t border-border mt-auto">
      {/* Newsletter Section */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-2">Stay in the Loop</h3>
            <p className="text-muted-foreground mb-6">
              Subscribe to our newsletter for the latest events and exclusive offers
            </p>
            <AnimatePresence mode="wait">
              {subscribeStatus === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 py-2"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{
                      scale: 1,
                      boxShadow: [
                        "0 0 0 0 hsl(var(--primary) / 0.4)",
                        "0 0 28px 6px hsl(var(--primary) / 0.25)",
                        "0 0 20px 4px hsl(var(--primary) / 0.2)",
                      ],
                    }}
                    transition={{
                      scale: { type: "spring", stiffness: 300, damping: 20 },
                      boxShadow: { duration: 0.6, ease: "easeOut" },
                    }}
                    className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center ring-4 ring-primary/40 shadow-[0_0_24px_hsl(var(--primary)_/_0.3)]"
                  >
                    <motion.div
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ delay: 0.15, duration: 0.3 }}
                    >
                      <Check className="h-9 w-9 text-primary stroke-[2.5]" />
                    </motion.div>
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent"
                  >
                    You&apos;re on the list!
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-muted-foreground"
                  >
                    Check your inbox for exclusive offers and event updates.
                  </motion.p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                  onSubmit={handleSubscribe}
                >
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 bg-background"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={subscribeStatus === "loading"}
                  />
                  <Button
                    type="submit"
                    className="bg-gradient-primary"
                    disabled={subscribeStatus === "loading"}
                  >
                    {subscribeStatus === "loading" ? (
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Subscribe
                      </>
                    )}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center mb-4" aria-label="Kanam Events home">
              <BrandLogo imgClassName="h-28 w-28" />
            </Link>
            <p className="text-muted-foreground mb-6 max-w-xs">
              Your gateway to unforgettable experiences. Discover, book, and enjoy events like never before.
            </p>
            
            {/* Contact — email only until we have a public address / phone */}
            <div className="space-y-3 text-sm">
              <a
                href="mailto:support@kanamevents.com"
                className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <span>support@kanamevents.com</span>
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">For Organizers</h4>
            <ul className="space-y-3">
              {footerLinks.organizers.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Separator />

      {/* Bottom Bar */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} KanamEvents. All rights reserved.
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-2">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 w-10 rounded-lg bg-secondary hover:bg-primary/10 flex items-center justify-center transition-colors group"
                  aria-label={social.label}
                >
                  <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              );
            })}
          </div>

          {/* Trust & Security – prominent for US market compliance */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Secured by
            </span>
            <div className="flex items-center gap-2">
              <div className="h-8 px-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-1.5 font-semibold text-primary text-xs">
                <Lock className="h-3.5 w-3.5" />
                SSL
              </div>
              <div className="h-8 px-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-1.5 font-semibold text-primary text-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                PCI DSS
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
