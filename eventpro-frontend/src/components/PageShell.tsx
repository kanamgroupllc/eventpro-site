import type { ReactNode } from "react";

/**
 * Editorial page wrapper: ambient gradients + z-index for content (Stitch / Electric Editorial).
 * Use inside routes that need full-page polish; keep children responsible for container width.
 */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`min-h-screen relative overflow-hidden bg-background font-body ${className ?? ""}`}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/3 -left-24 w-80 h-80 rounded-full bg-primary-glow/5 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 rounded-full bg-accent/5 blur-3xl" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
