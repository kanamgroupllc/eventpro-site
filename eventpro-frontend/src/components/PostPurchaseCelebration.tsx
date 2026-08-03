import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle, Ticket, Wallet, Smartphone, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";

interface PostPurchaseCelebrationProps {
  orderId: string | null;
  eventName?: string;
  /** Optional: "You've joined 450 others" when provided */
  attendeeCount?: number | null;
}

const QR_BASE = "https://api.qrserver.com/v1/create-qr-code/";

export function PostPurchaseCelebration({ orderId, eventName, attendeeCount }: PostPurchaseCelebrationProps) {
  const navigate = useNavigate();
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/events` : "";
  const shareText = eventName
    ? `I'm going to ${eventName}! Get your ticket: ${shareUrl}`
    : `Just got my ticket! Check out events: ${shareUrl}`;

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied! Share it with friends.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-background/95 backdrop-blur-sm py-6 px-4">
      <style>{`
        @keyframes ticket-breathe {
          0%, 100% { box-shadow: 0 0 20px rgba(147, 51, 234, 0.25), 0 0 40px rgba(147, 51, 234, 0.1); }
          50% { box-shadow: 0 0 32px rgba(147, 51, 234, 0.4), 0 0 60px rgba(147, 51, 234, 0.15); }
        }
        .ticket-qr-glow { animation: ticket-breathe 2.5s ease-in-out infinite; }
        .ticket-perforated {
          border: 2px dashed rgba(255,255,255,0.2);
          border-right: none;
          position: relative;
        }
        .ticket-perforated::after {
          content: '';
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 12px;
          background: linear-gradient(90deg, transparent 0%, transparent 45%, rgba(255,255,255,0.15) 50%, transparent 55%, transparent 100%);
          background-size: 4px 100%;
          background-repeat: repeat-y;
        }
      `}</style>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 w-[32rem] h-[32rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-primary-glow/15 blur-3xl" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-lg mx-auto text-center"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {/* Success icon */}
        <motion.div
          className="mx-auto mb-4 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-emerald-500/20 ring-4 ring-emerald-500/30 shadow-[0_0_40px_rgba(34,197,94,0.3)]"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
        >
          <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-emerald-500" />
        </motion.div>

        <motion.h1
          className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-1"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          You’re in!
        </motion.h1>
        {/* Community message */}
        <motion.p
          className="text-muted-foreground text-sm sm:text-base mb-1 px-2"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          {eventName ? (
            <>
              You’re going to <span className="font-semibold text-foreground">[{eventName}]</span>!
              {attendeeCount != null && attendeeCount > 0 ? (
                <> You’ve joined {attendeeCount.toLocaleString()} others in this community experience.</>
              ) : (
                <> You’ve joined the community for this experience.</>
              )}
            </>
          ) : (
            "Your ticket is confirmed."
          )}
        </motion.p>
        {orderId && (
          <motion.p
            className="text-xs font-mono text-foreground/70 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Order #{orderId.slice(0, 8).toUpperCase()}
          </motion.p>
        )}

        {/* Digital ticket stub — slide up + perforated edge */}
        <motion.div
          className="ticket-perforated rounded-l-2xl sm:rounded-l-3xl border-white/10 bg-[rgba(255,255,255,0.07)] backdrop-blur-xl p-5 sm:p-6 mb-6 shadow-[0_0_30px_rgba(147,51,234,0.2)]"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5, ease: "easeOut" }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Ticket className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <span className="font-semibold text-base sm:text-lg">Digital Ticket</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            Show this QR at the door. We’ve also sent your ticket by email.
          </p>
          {/* QR code with breathing glow */}
          <div className="ticket-qr-glow inline-flex p-4 rounded-2xl bg-white">
            {orderId ? (
              <img
                src={`${QR_BASE}?size=180x180&data=${encodeURIComponent(orderId)}&format=svg`}
                alt="Ticket QR code"
                className="w-[180px] h-[180px] rounded-lg"
              />
            ) : (
              <div className="w-[180px] h-[180px] rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm">
                QR code
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Scan at door</p>

          {/* Wallet actions — vibrant branded buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            <Button
              variant="outline"
              className="rounded-xl border-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 h-12 font-medium"
              onClick={() => window.open("https://support.apple.com/en-us/HT207945", "_blank")}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Add to Apple Wallet
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 h-12 font-medium"
              onClick={() => window.open("https://pay.google.com/about/passes/", "_blank")}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Add to Google Wallet
            </Button>
          </div>
        </motion.div>

        {/* Share this event — diaspora / peer-to-peer */}
        <motion.div
          className="mb-6"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.65 }}
        >
          <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center justify-center gap-2">
            <Share2 className="h-4 w-4" />
            Share this event
          </p>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
              onClick={handleShareWhatsApp}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl border-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
              onClick={handleCopyLink}
            >
              <Share2 className="h-5 w-5 mr-2" />
              Copy link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Peer-to-peer sharing is the most effective way to grow your community.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row gap-3 justify-center"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.75 }}
        >
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("/events")}>
            Browse more events
          </Button>
          <Button
            className="rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white"
            onClick={() => navigate("/")}
          >
            Back to home
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
