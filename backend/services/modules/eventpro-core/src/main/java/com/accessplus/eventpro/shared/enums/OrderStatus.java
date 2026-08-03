package com.accessplus.eventpro.shared.enums;

/**
 * Enum representing the status of an order.
 *
 * <p>Values match the PostgreSQL enum type 'order_status':
 * <ul>
 *   <li>PENDING - Order created but payment not yet processed</li>
 *   <li>PAID - Order payment successful</li>
 *   <li>CANCELLED - Order cancelled (payment failed or user cancelled)</li>
 *   <li>REFUNDED - Order refunded after payment</li>
 * </ul>
 */
public enum OrderStatus {
    PENDING,
    PAID,
    CANCELLED,
    REFUNDED
}
