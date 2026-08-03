package com.accessplus.eventpro.order.order.model;

import java.util.UUID;

/**
 * Represents a line item for guest checkout (event + ticket type + quantity).
 */
public record GuestOrderItem(UUID eventId, String ticketType, int quantity) {}
