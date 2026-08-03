/**
 * Order API returns line items as `orderItems` with nested `ticket`; the ticket's event id is
 * often exposed as `eventIdType` (legacy). Flat `tickets` arrays may use `eventId` directly.
 */
export function getEventIdFromOrderLineItem(item: unknown): string | undefined {
  if (!item || typeof item !== "object") return undefined;
  const o = item as Record<string, unknown>;
  if (typeof o.eventId === "string" && o.eventId) return o.eventId;
  if (typeof o.eventIdType === "string" && o.eventIdType) return o.eventIdType;
  const nested = o.ticket;
  if (nested && typeof nested === "object") {
    const t = nested as Record<string, unknown>;
    if (typeof t.eventId === "string" && t.eventId) return t.eventId;
    if (typeof t.eventIdType === "string" && t.eventIdType) return t.eventIdType;
  }
  return undefined;
}

/** Ticket id from an order line item (for door check-in QR payload). */
export function getTicketIdFromOrderLineItem(item: unknown): string | undefined {
  if (!item || typeof item !== "object") return undefined;
  const o = item as Record<string, unknown>;
  if (typeof o.id === "string" && /^[0-9a-f-]{36}$/i.test(o.id)) return o.id;
  const nested = o.ticket;
  if (nested && typeof nested === "object") {
    const id = (nested as Record<string, unknown>).id;
    if (typeof id === "string" && id) return id;
  }
  return undefined;
}

/** S3 QR image URL from an order line item (post-purchase display). */
export function getQrCodeFromOrderLineItem(item: unknown): string | undefined {
  if (!item || typeof item !== "object") return undefined;
  const o = item as Record<string, unknown>;
  if (typeof o.qrCode === "string" && o.qrCode) return o.qrCode;
  const nested = o.ticket;
  if (nested && typeof nested === "object") {
    const qr = (nested as Record<string, unknown>).qrCode;
    if (typeof qr === "string" && qr) return qr;
  }
  return undefined;
}

/** All order line items from either `orderItems` or legacy `tickets`. */
export function getOrderLineItems(order: { orderItems?: unknown[]; tickets?: unknown[] } | null | undefined): unknown[] {
  if (!order) return [];
  if (Array.isArray(order.orderItems) && order.orderItems.length > 0) return order.orderItems;
  if (Array.isArray(order.tickets)) return order.tickets;
  return [];
}

/**
 * Expand order line items into one entry per physical ticket (duplicates rows when quantity > 1).
 */
export function expandOrderLineItems(items: unknown[] | undefined): unknown[] {
  if (!items?.length) return [];
  const expanded: unknown[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const q = o.quantity;
    const count = typeof q === "number" && q > 0 ? q : 1;
    for (let i = 0; i < count; i++) {
      expanded.push({ ...o, quantity: 1, _ticketInstance: i + 1, _ticketInstanceTotal: count });
    }
  }
  return expanded;
}

/** Sum line-item quantities (each `orderItems` row may represent multiple tickets). */
export function getTicketQuantityFromOrderItems(items: unknown[] | undefined): number {
  if (!items?.length) return 0;
  let n = 0;
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const q = (item as Record<string, unknown>).quantity;
    n += typeof q === "number" && q > 0 ? q : 1;
  }
  return n;
}

/**
 * Normalize `orderDate` / `createdAt` from API (ISO string or Jackson LocalDateTime array).
 */
export function parseOrderTimestamp(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw.length >= 3) {
    const y = Number(raw[0]);
    const mo = Number(raw[1]);
    const d = Number(raw[2]);
    const h = raw.length > 3 ? Number(raw[3]) : 0;
    const mi = raw.length > 4 ? Number(raw[4]) : 0;
    const s = raw.length > 5 ? Number(raw[5]) : 0;
    if (!Number.isNaN(y) && !Number.isNaN(mo) && !Number.isNaN(d)) {
      return new Date(y, mo - 1, d, h, mi, s).toISOString();
    }
  }
  return "";
}

/** Parse API date/time fields (ISO string or Jackson LocalDateTime array) to Date. */
export function parseApiDateTime(raw: unknown): Date | undefined {
  const iso = parseOrderTimestamp(raw);
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Event start time from a nested ticket on an order line item. */
export function getEventDateFromOrderLineItem(item: unknown): Date | undefined {
  if (!item || typeof item !== "object") return undefined;
  const nested = (item as Record<string, unknown>).ticket;
  if (!nested || typeof nested !== "object") return undefined;
  const t = nested as Record<string, unknown>;
  return parseApiDateTime(t.startTime ?? t.startDateTime);
}

/** Event end time from a nested ticket on an order line item. */
export function getEventEndFromOrderLineItem(item: unknown): Date | undefined {
  if (!item || typeof item !== "object") return undefined;
  const nested = (item as Record<string, unknown>).ticket;
  if (!nested || typeof nested !== "object") return undefined;
  const t = nested as Record<string, unknown>;
  return parseApiDateTime(t.endTime ?? t.endDateTime);
}

/** Best-effort event start date for an order (event API fields, then line-item ticket times). */
export function resolveOrderEventDate(
  order: { orderItems?: unknown[]; tickets?: unknown[] },
  event?: { startTime?: unknown; startDateTime?: unknown } | null
): Date | undefined {
  const fromEvent = parseApiDateTime(event?.startTime ?? event?.startDateTime);
  if (fromEvent) return fromEvent;
  for (const item of getOrderLineItems(order)) {
    const fromTicket = getEventDateFromOrderLineItem(item);
    if (fromTicket) return fromTicket;
  }
  return undefined;
}

/** Best-effort event end date for an order. */
export function resolveOrderEventEndDate(
  order: { orderItems?: unknown[]; tickets?: unknown[] },
  event?: { endTime?: unknown; endDateTime?: unknown } | null
): Date | undefined {
  const fromEvent = parseApiDateTime(event?.endTime ?? event?.endDateTime);
  if (fromEvent) return fromEvent;
  for (const item of getOrderLineItems(order)) {
    const fromTicket = getEventEndFromOrderLineItem(item);
    if (fromTicket) return fromTicket;
  }
  return undefined;
}

/** Whether an event's ticket sales window has closed (end time preferred, else start time). */
export function isEventEnded(
  event?: { endTime?: unknown; endDateTime?: unknown; startTime?: unknown; startDateTime?: unknown } | null,
  now = new Date()
): boolean {
  const end = parseApiDateTime(event?.endTime ?? event?.endDateTime);
  if (end) return end < now;
  const start = parseApiDateTime(event?.startTime ?? event?.startDateTime);
  if (start) return start < now;
  return false;
}

/**
 * Upcoming tickets: event has not ended yet. Cancelled/refunded orders always go to Past.
 */
export function isUpcomingOrder(
  eventStart: Date | undefined,
  eventEnd: Date | undefined,
  orderStatus?: string,
  now = new Date()
): boolean {
  const status = (orderStatus ?? "").toUpperCase();
  if (status === "CANCELLED" || status === "REFUNDED") return false;

  if (eventEnd) return eventEnd >= now;
  if (eventStart) return eventStart >= now;
  return true;
}
