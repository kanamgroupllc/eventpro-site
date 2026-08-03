import type { ReactNode } from "react";

/**
 * Shared editorial shell for auth routes (Stitch: soft surfaces, ambient gradient, no harsh dividers).
 */
export function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center py-12 px-4 bg-background">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-primary/6 blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-80 h-80 rounded-full bg-primary-glow/5 blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
