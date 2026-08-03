/**
 * Tier-based feature flags for organizer features.
 * Matches web: eventpro-frontend/src/pages/Organizer.tsx
 */

/** Merchandise & add-ons are Pro and Enterprise only (per pricing page). */
export function canUseAddons(tier: string | undefined): boolean {
  const t = (tier ?? "BASIC").toUpperCase();
  return t === "PRO" || t === "ENTERPRISE";
}

/** Email ticket holders is Pro and Enterprise only. */
export function canEmailAttendees(tier: string | undefined): boolean {
  const t = (tier ?? "BASIC").toUpperCase();
  return t === "PRO" || t === "ENTERPRISE";
}

export function tierLabel(tier: string | undefined): string {
  const t = (tier ?? "BASIC").toUpperCase();
  return t === "ENTERPRISE" ? "Enterprise" : t === "PRO" ? "Pro" : "Basic";
}
