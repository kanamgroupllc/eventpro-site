const TICKET_TYPE_LABELS: Record<string, string> = {
  VIP: "VIP",
  REGULAR: "Regular",
  EARLY_BIRD: "Early Bird",
};

/** Human-readable label for GA ticket type enums and compound ticket names from the API. */
export function formatTicketTypeName(name: string | undefined | null): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (!trimmed) return "";

  if (TICKET_TYPE_LABELS[trimmed]) return TICKET_TYPE_LABELS[trimmed];

  let formatted = trimmed;
  for (const [key, label] of Object.entries(TICKET_TYPE_LABELS)) {
    formatted = formatted.replace(new RegExp(`\\b${key}\\b`, "g"), label);
  }

  if (formatted !== trimmed) {
    return formatted.replace(/\s+Ticket\s*$/i, "").trim();
  }

  if (/^[A-Z]+(_[A-Z]+)*$/.test(trimmed)) {
    return trimmed
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  }

  return trimmed;
}
