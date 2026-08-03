const CORRELATION_STORAGE_KEY = "eventpro_correlation_id";

export function getOrCreateCorrelationId(): string {
  if (typeof sessionStorage === "undefined") {
    return crypto.randomUUID();
  }
  let id = sessionStorage.getItem(CORRELATION_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(CORRELATION_STORAGE_KEY, id);
  }
  return id;
}

export function resetCorrelationId(): string {
  const id = crypto.randomUUID();
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(CORRELATION_STORAGE_KEY, id);
  }
  return id;
}
