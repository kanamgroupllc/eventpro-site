/** Convert YouTube or Vimeo URL to embed URL for iframe/WebView. Returns null if not supported. */
export function getPromotionalVideoEmbedUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== "string") return null;
  let trimmed = url.trim();
  if (!trimmed) return null;

  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  const ytPatterns = [
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of ytPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&playsinline=1`;
    }
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return null;
}

/** HTML document for in-app WebView players (YouTube requires a valid Referer). */
export function getPromotionalVideoEmbedHtml(embedUrl: string, baseOrigin = "https://eventpro.com"): string {
  const safeUrl = embedUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <base href="${baseOrigin}/" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <iframe
    src="${safeUrl}"
    title="Promotional video"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
  ></iframe>
</body>
</html>`;
}
