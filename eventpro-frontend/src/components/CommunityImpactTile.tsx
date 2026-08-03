import { motion } from "framer-motion";
import { Users } from "lucide-react";

export interface CommunityImpactTileProps {
  /** e.g. 450 — use 0 or undefined to hide count and show generic copy */
  attendeeCount?: number;
  eventName?: string;
  className?: string;
}

export function CommunityImpactTile({
  attendeeCount = 0,
  eventName,
  className,
}: CommunityImpactTileProps) {
  const hasCount = attendeeCount > 0;
  const copy = hasCount
    ? `Join ${attendeeCount} others at this event`
    : eventName
      ? `Be part of ${eventName}`
      : "Join others at this event";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className={[
        "rounded-xl border border-white/15 bg-[rgba(255,255,255,0.06)] backdrop-blur-[12px] p-4",
        "flex items-center gap-3",
        className,
      ].filter(Boolean).join(" ")}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
        <Users className="h-5 w-5 text-primary" />
      </div>
      <p className="text-sm font-medium text-foreground">
        {copy}
      </p>
    </motion.div>
  );
}
