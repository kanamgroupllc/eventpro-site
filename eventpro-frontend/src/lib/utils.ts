import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Use proxy for S3/LocalStack image URLs to avoid 403 when loading in the browser. */
export function getEventImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl || typeof imageUrl !== "string") return undefined;
  const trimmed = imageUrl.trim();
  if (!trimmed) return undefined;
  // Ignore non-http URLs (e.g. chrome-extension:, data:) so they are never used as img src
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return undefined;
  if (trimmed.startsWith("chrome-extension:") || trimmed.startsWith("moz-extension:")) return undefined;
  if (isAppOwnedS3ImageUrl(trimmed)) {
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    return `${base}/api/v1/images/proxy?url=${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

function isAppOwnedS3ImageUrl(url: string): boolean {
  const hasAllowedImagePath = url.includes("/events/") || url.includes("/profile-pictures/");
  if (!hasAllowedImagePath) return false;
  if (url.includes(":4566")) return true;

  try {
    const parsed = new URL(url);
    return parsed.hostname.includes(".s3.") && parsed.hostname.endsWith(".amazonaws.com");
  } catch {
    return false;
  }
}

/** Convert YouTube or Vimeo URL to embed URL for iframe. Returns null if not supported. */
export { getPromotionalVideoEmbedUrl } from "@eventpro/shared";
