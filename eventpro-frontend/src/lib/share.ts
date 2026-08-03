/**
 * Append UTM source for organizer analytics (AI Insights).
 * Use for all shared links so organizers can see which channels drive traffic.
 */
export type ShareSource =
  | "whatsapp"
  | "twitter"
  | "facebook"
  | "copy"
  | "story"
  | "instagram";

export function addTracking(url: string, source: ShareSource): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}utm_source=${source}`;
}

export function buildShareUrl(
  baseUrl: string,
  source: ShareSource,
  options: { title?: string; text?: string } = {}
): string {
  const url = addTracking(baseUrl, source);
  const text = options.text ?? options.title ?? "";
  switch (source) {
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(text ? `${text} ${url}` : url)}`;
    case "twitter":
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    default:
      return url;
  }
}
