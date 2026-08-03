package com.accessplus.eventpro.shared.enums;

/**
 * Enum representing event publication status.
 *
 * <p>Values match the PostgreSQL enum type 'event_status':
 * <ul>
 *   <li>DRAFT - Event created but not yet published (default state)</li>
 *   <li>PUBLISHED - Event is published and visible to public</li>
 *   <li>CANCELLED - Event has been cancelled</li>
 *   <li>COMPLETED - Event has ended</li>
 * </ul>
 */
public enum EventStatus {
    DRAFT,
    PUBLISHED,
    CANCELLED,
    COMPLETED
}
