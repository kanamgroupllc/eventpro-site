package com.accessplus.eventpro.shared.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Order item entity representing individual items within an order.
 * Framework-agnostic entity that works with both Spring Boot and Quarkus.
 */
@Entity
@Table(name = "order_items", indexes = {
    @Index(name = "idx_order_item_order", columnList = "order_id"),
    @Index(name = "idx_order_item_ticket", columnList = "ticket_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemEntity extends BaseEntity {

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", message = "Price must be non-negative")
    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @NotNull(message = "Order ID is required")
    @Column(name = "order_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID orderId;

    @NotNull(message = "Ticket ID is required")
    @Column(name = "ticket_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID ticketId;

    /**
     * Order relationship (bidirectional).
     * Uses insertable=false, updatable=false so the orderId UUID field is the source of truth.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", insertable = false, updatable = false, foreignKey = @ForeignKey(name = "fk_order_item_order"))
    private OrderEntity order;

    /**
     * Ticket relationship (optional, for backend services that need it).
     * Uses insertable=false, updatable=false so the ticketId UUID field is the source of truth.
     * Backend services can populate this when loading entities with relationships.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", insertable = false, updatable = false, foreignKey = @ForeignKey(name = "fk_order_item_ticket"))
    private TicketEntity ticket;
}
