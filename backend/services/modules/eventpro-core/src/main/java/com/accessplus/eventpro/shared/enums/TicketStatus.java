package com.accessplus.eventpro.shared.enums;

/**
 * Enum representing ticket status.
 *
 * <p>Values match the PostgreSQL enum type 'ticket_status':
 * <ul>
 *   <li>AVAILABLE - Ticket is available for purchase</li>
 *   <li>SOLD - Ticket has been sold (final state)</li>
 *   <li>RESERVED - Ticket is reserved (in cart or order pending payment)</li>
 * </ul>
 */
public enum TicketStatus {
    AVAILABLE,
    SOLD,
    RESERVED
}
