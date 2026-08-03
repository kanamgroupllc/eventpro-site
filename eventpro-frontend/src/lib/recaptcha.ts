declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

function scriptUrl(siteKey: string): string {
  return `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
}

export async function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (!siteKey) return;
  if (typeof window !== "undefined" && window.grecaptcha?.execute) return;
  const url = scriptUrl(siteKey);
  if (document.querySelector('script[src*="google.com/recaptcha/api.js"]')) {
    await new Promise<void>((resolve) => {
      const deadline = Date.now() + 15000;
      const tick = () => {
        if (window.grecaptcha?.execute) {
          resolve();
          return;
        }
        if (Date.now() > deadline) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
    document.head.appendChild(script);
  });
}

/**
 * Site key: VITE_RECAPTCHA_SITE_KEY first, else public payment config (no api.ts import — avoids cycles).
 */
export async function resolveRecaptchaSiteKey(): Promise<string> {
  const env = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim?.();
  if (env) return env;
  try {
    const r = await fetch("/api/v1/payments/config");
    if (!r.ok) {
      return "";
    }
    // ApiResponse<T>: { success, message, data: T, timestamp } — data is the map directly, not nested
    const json = (await r.json()) as { data?: Record<string, string> };
    return json?.data?.recaptchaSiteKey?.trim?.() ?? "";
  } catch {
    return "";
  }
}

/** v3 execute; returns undefined when no site key. */
export async function executeRecaptcha(siteKey: string, action: string): Promise<string | undefined> {
  if (!siteKey) return undefined;
  await loadRecaptchaScript(siteKey);
  if (!window.grecaptcha?.execute) return undefined;
  return new Promise((resolve, reject) => {
    window.grecaptcha!.ready(async () => {
      try {
        const token = await window.grecaptcha!.execute(siteKey, { action });
        resolve(token);
      } catch (e) {
        reject(e);
      }
    });
  });
}
