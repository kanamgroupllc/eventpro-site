import { useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Twitter,
  Facebook,
  Link2,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addTracking, buildShareUrl, type ShareSource } from "@/lib/share";
import { cn } from "@/lib/utils";

export interface ShareActionsProps {
  /** Full URL to the event (or page) to share. */
  url: string;
  /** Event or page title for share text. */
  title?: string;
  /** Optional short description. */
  description?: string;
  /** Optional event date string for Story card. */
  eventDate?: string;
  /** Layout: "bento" = tile with gradient border + breathing glow; "inline" = row only. */
  variant?: "bento" | "inline";
  /** Optional class for the container. */
  className?: string;
}

const TRACKED_COPY_MESSAGE = "Link copied! Spread the word! 🚀";

function useCopyWithToast() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(TRACKED_COPY_MESSAGE, {
        classNames: {
          toast:
            "border-primary/50 shadow-[0_0_24px_rgba(147,51,234,0.35),0_0_48px_rgba(147,51,234,0.15)] bg-background/95 backdrop-blur-md",
        },
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };
  return { copied, copy };
}

const hoverGlow: Record<ShareSource, string> = {
  whatsapp: "hover:shadow-[0_0_20px_rgba(37,211,102,0.5)]",
  twitter: "hover:shadow-[0_0_20px_rgba(29,155,240,0.5)]",
  facebook: "hover:shadow-[0_0_20px_rgba(24,119,242,0.5)]",
  copy: "hover:shadow-[0_0_20px_rgba(147,51,234,0.5)]",
  story: "hover:shadow-[0_0_20px_rgba(225,48,108,0.5)]",
  instagram: "hover:shadow-[0_0_20px_rgba(225,48,108,0.5)]",
};

/** Minimal share bar: WhatsApp, X, Facebook, Copy. No Dialog. Use on cards to avoid ref/portal issues. */
export function ShareButtonsBar({
  url,
  title = "",
  className,
  /** When true, wrap in glass + purple-to-orange gradient border and breathing glow (event details). */
  vibrant = false,
}: Pick<ShareActionsProps, "url" | "title" | "className"> & { vibrant?: boolean }) {
  const { copied, copy } = useCopyWithToast();
  const shareText = title ? `${title}. ` : "";
  const trackedUrl = addTracking(url, "copy");

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    copy(trackedUrl);
  };

  const buttonClass = vibrant
    ? "flex items-center justify-center rounded-xl border-2 border-white/30 bg-white/15 dark:bg-white/10 backdrop-blur-md h-10 w-10 hover:scale-110 transition-all duration-200"
    : "flex items-center justify-center rounded-lg border border-white/20 bg-white/10 backdrop-blur-md h-9 w-9 transition-all";

  const bar = (
    <div className={cn("flex items-center gap-2 sm:gap-3 flex-wrap", !vibrant && className)} role="group" aria-label="Share">
      <a
        href={buildShareUrl(url, "whatsapp", { text: shareText ? `${shareText}${trackedUrl}` : trackedUrl })}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        onClick={(e) => e.stopPropagation()}
        className={cn(buttonClass, "hover:shadow-[0_0_16px_rgba(37,211,102,0.5)]")}
        style={{ color: "#25D366" }}
      >
        <MessageCircle className="h-4 w-4" />
      </a>
      <a
        href={buildShareUrl(url, "twitter", { title: shareText || title })}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        onClick={(e) => e.stopPropagation()}
        className={cn(buttonClass, "hover:shadow-[0_0_16px_rgba(29,155,240,0.5)]")}
        style={{ color: "#1DA1F2" }}
      >
        <Twitter className="h-4 w-4" />
      </a>
      <a
        href={buildShareUrl(url, "facebook")}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        onClick={(e) => e.stopPropagation()}
        className={cn(buttonClass, "hover:shadow-[0_0_16px_rgba(24,119,242,0.5)]")}
        style={{ color: "#1877F2" }}
      >
        <Facebook className="h-4 w-4" />
      </a>
      <button
        type="button"
        aria-label="Copy link"
        onClick={handleCopy}
        className={cn(buttonClass, "hover:shadow-[0_0_16px_rgba(147,51,234,0.5)] text-primary")}
      >
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );

  if (vibrant) {
    return (
      <div
        className={cn(
          "rounded-xl border-2 p-3 inline-block",
          "bg-gradient-to-br from-primary/10 to-orange-500/10 border-primary/40 dark:border-primary/50",
          "shadow-[0_0_24px_rgba(147,51,234,0.2),0_0_48px_rgba(147,51,234,0.08)]",
          "hover:shadow-[0_0_28px_rgba(147,51,234,0.3),0_0_56px_rgba(251,146,60,0.1)]",
          "transition-shadow duration-300 share-breathe-vibrant",
          className
        )}
      >
        <style>{`
          .share-breathe-vibrant { animation: share-breathe 2.5s ease-in-out infinite; }
          @keyframes share-breathe {
            0%, 100% { box-shadow: 0 0 24px rgba(147,51,234,0.2), 0 0 48px rgba(147,51,234,0.08); }
            50% { box-shadow: 0 0 32px rgba(147,51,234,0.35), 0 0 56px rgba(251,146,60,0.12); }
          }
        `}</style>
        {bar}
      </div>
    );
  }
  return bar;
}

export function ShareActions({
  url,
  title = "",
  description,
  eventDate,
  variant = "bento",
  className,
}: ShareActionsProps) {
  const { copied, copy } = useCopyWithToast();
  const shareText = title ? `${title}. ` : "";
  const trackedUrl = addTracking(url, "copy");
  const trackedUrlStory = addTracking(url, "story");

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    copy(trackedUrl);
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = buildShareUrl(url, "whatsapp", {
      text: shareText ? `${shareText}${trackedUrl}` : trackedUrl,
    });
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handleTwitter = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = buildShareUrl(url, "twitter", { title: shareText || title });
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handleFacebook = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = buildShareUrl(url, "facebook");
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const content = (
    <div className={cn("flex items-center gap-3 flex-wrap", variant === "inline" && "gap-4")}>
      {/* WhatsApp — primary, most prominent (diaspora #1) */}
      <motion.button
        type="button"
        aria-label="Share on WhatsApp"
        onClick={handleWhatsApp}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "flex items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md transition-all duration-200",
          "text-[#25D366] hover:bg-white/20",
          variant === "bento" ? "h-11 w-11" : "h-10 w-10",
          hoverGlow.whatsapp
        )}
      >
        <MessageCircle className={variant === "bento" ? "h-5 w-5" : "h-4 w-4"} />
      </motion.button>

      <motion.a
        href={buildShareUrl(url, "twitter", { title: shareText || title })}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        onClick={(e) => e.stopPropagation()}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "flex items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md transition-all duration-200",
          "text-[#1DA1F2] hover:bg-white/20",
          variant === "bento" ? "h-11 w-11" : "h-10 w-10",
          hoverGlow.twitter
        )}
      >
        <Twitter className={variant === "bento" ? "h-5 w-5" : "h-4 w-4"} />
      </motion.a>

      <motion.a
        href={buildShareUrl(url, "facebook")}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        onClick={(e) => e.stopPropagation()}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "flex items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md transition-all duration-200",
          "text-[#1877F2] hover:bg-white/20",
          variant === "bento" ? "h-11 w-11" : "h-10 w-10",
          hoverGlow.facebook
        )}
      >
        <Facebook className={variant === "bento" ? "h-5 w-5" : "h-4 w-4"} />
      </motion.a>

      <motion.button
        type="button"
        aria-label="Copy link"
        onClick={handleCopy}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "flex items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md transition-all duration-200",
          "text-primary hover:bg-white/20",
          variant === "bento" ? "h-11 w-11" : "h-10 w-10",
          hoverGlow.copy
        )}
      >
        {copied ? (
          <Check className={variant === "bento" ? "h-5 w-5 text-emerald-500" : "h-4 w-4 text-emerald-500"} />
        ) : (
          <Link2 className={variant === "bento" ? "h-5 w-5" : "h-4 w-4"} />
        )}
      </motion.button>

      {/* Share to Story — vibrant vertical card modal (plain button so Radix Dialog ref works) */}
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="Share to story"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "flex items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md transition-all duration-200",
              "text-pink-500 hover:bg-white/20 hover:scale-110 hover:shadow-[0_0_20px_rgba(225,48,108,0.5)]",
              variant === "bento" ? "h-11 w-11" : "h-10 w-10",
              hoverGlow.story
            )}
          >
            <ImageIcon className={variant === "bento" ? "h-5 w-5" : "h-4 w-4"} />
          </button>
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-[380px] p-0 gap-0 overflow-hidden border-2 border-primary/30 bg-background/95 backdrop-blur-xl shadow-[0_0_40px_rgba(147,51,234,0.2)]"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Share to story</DialogTitle>
          </DialogHeader>
          {/* Vibrant vertical card (Spotify Wrapped style) — 9:16 aspect for story */}
          <div
            className="relative w-full aspect-[9/16] max-h-[70vh] flex flex-col justify-between overflow-hidden rounded-b-xl"
            style={{
              background: "linear-gradient(165deg, hsl(214 95% 48% / 0.95) 0%, hsl(214 90% 58% / 0.9) 40%, hsl(0 0% 4% / 0.9) 100%)",
              boxShadow: "inset 0 0 60px rgba(255,255,255,0.1)",
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,255,255,0.2),transparent)]" />
            <div className="relative p-6 pt-8">
              <p className="text-white/90 text-xs font-semibold uppercase tracking-widest mb-2">
                You're invited
              </p>
              <h3 className="text-2xl font-bold text-white drop-shadow-md line-clamp-3">
                {title || "Event"}
              </h3>
              {eventDate && (
                <p className="text-white/90 text-sm mt-2 font-medium">
                  {eventDate}
                </p>
              )}
            </div>
            <div className="relative p-6 pb-8">
              <div className="rounded-xl bg-white/20 backdrop-blur-md border border-white/30 px-4 py-3 text-center">
                <p className="text-white text-sm font-semibold">Get your tickets</p>
                <p className="text-white/80 text-xs mt-0.5 truncate">{url}</p>
              </div>
              <p className="text-white/70 text-xs text-center mt-3">
                Screenshot this card to share to your story
              </p>
            </div>
          </div>
          <div className="p-4 border-t border-border flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90"
              onClick={() => copy(trackedUrlStory)}
            >
              Copy link
            </button>
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-xl border border-primary/50 bg-primary/10 text-primary py-2.5 text-sm font-medium text-center hover:bg-primary/20"
            >
              Open Instagram
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  return <div className={className}>{content}</div>;
}

/** Standalone Share to Story button + dialog. Use in bento so all 5 buttons always render. */
function ShareToStoryDialog({
  url,
  title = "",
  eventDate,
}: Pick<ShareActionsProps, "url" | "title" | "eventDate">) {
  const { copy } = useCopyWithToast();
  const trackedUrlStory = addTracking(url, "story");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Share to story"
          className="flex items-center justify-center rounded-xl border-2 border-white/30 bg-white/15 dark:bg-white/10 backdrop-blur-md h-10 w-10 hover:scale-110 hover:shadow-[0_0_16px_rgba(225,48,108,0.5)] transition-all duration-200"
          style={{ color: "#E1306C" }}
        >
          <ImageIcon className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[380px] p-0 gap-0 overflow-hidden border-2 border-primary/30 bg-background/95 backdrop-blur-xl shadow-[0_0_40px_rgba(147,51,234,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Share to story</DialogTitle>
        </DialogHeader>
        <div
          className="relative w-full aspect-[9/16] max-h-[70vh] flex flex-col justify-between overflow-hidden rounded-b-xl"
          style={{
            background: "linear-gradient(165deg, hsl(214 95% 48% / 0.95) 0%, hsl(214 90% 58% / 0.9) 40%, hsl(0 0% 4% / 0.9) 100%)",
            boxShadow: "inset 0 0 60px rgba(255,255,255,0.1)",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,255,255,0.2),transparent)]" />
          <div className="relative p-6 pt-8">
            <p className="text-white/90 text-xs font-semibold uppercase tracking-widest mb-2">You&apos;re invited</p>
            <h3 className="text-2xl font-bold text-white drop-shadow-md line-clamp-3">{title || "Event"}</h3>
            {eventDate && <p className="text-white/90 text-sm mt-2 font-medium">{eventDate}</p>}
          </div>
          <div className="relative p-6 pb-8">
            <div className="rounded-xl bg-white/20 backdrop-blur-md border border-white/30 px-4 py-3 text-center">
              <p className="text-white text-sm font-semibold">Get your tickets</p>
              <p className="text-white/80 text-xs mt-0.5 truncate">{url}</p>
            </div>
            <p className="text-white/70 text-xs text-center mt-3">Screenshot this card to share to your story</p>
          </div>
        </div>
        <div className="p-4 border-t border-border flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90"
            onClick={() => copy(trackedUrlStory)}
          >
            Copy link
          </button>
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-xl border border-primary/50 bg-primary/10 text-primary py-2.5 text-sm font-medium text-center hover:bg-primary/20"
          >
            Open Instagram
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ShareActionsContainer({
  variant = "bento",
  className,
  ...props
}: ShareActionsProps) {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <ShareActions variant="inline" {...props} />
      </div>
    );
  }
  return (
    <motion.div
      className={cn(
        "rounded-xl border-2 border-transparent bg-white/10 backdrop-blur-md p-4 transition-all duration-300",
        "bg-gradient-to-br from-primary/5 to-primary-glow/5 border-primary/20",
        "hover:border-primary/40 hover:shadow-[0_0_28px_rgba(147,51,234,0.25),0_0_56px_rgba(147,51,234,0.1)]",
        "share-actions-breathe",
        className
      )}
      whileHover={{ scale: 1.01 }}
    >
      <style>{`
        .share-actions-breathe:hover {
          animation: share-breathe 2.5s ease-in-out infinite;
        }
        @keyframes share-breathe {
          0%, 100% { box-shadow: 0 0 28px rgba(147,51,234,0.25), 0 0 56px rgba(147,51,234,0.1); }
          50% { box-shadow: 0 0 36px rgba(147,51,234,0.4), 0 0 64px rgba(147,51,234,0.2); }
        }
      `}</style>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Share this event
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <ShareButtonsBar url={props.url} title={props.title} />
        <ShareToStoryDialog url={props.url} title={props.title} eventDate={props.eventDate} />
      </div>
    </motion.div>
  );
}
