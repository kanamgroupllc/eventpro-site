package com.accessplus.eventpro.shared.enums;

/**
 * Enum representing ticket types.
 *
 * <p>Values match the PostgreSQL enum type 'ticket_type':
 * <ul>
 *   <li>VIP - Premium ticket type</li>
 *   <li>REGULAR - Standard ticket type</li>
 *   <li>EARLY_BIRD - Early bird discount ticket type</li>
 * </ul>
 */
public enum TicketType {
    VIP,
    REGULAR,
    EARLY_BIRD
}
