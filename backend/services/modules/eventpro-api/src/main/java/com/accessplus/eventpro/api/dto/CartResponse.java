package com.accessplus.eventpro.api.dto;

import com.accessplus.eventpro.order.cart.entity.CartEntity;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.ArrayList;
import java.util.Map;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CartResponse {

    private UUID id;
    private Set<CartItemResponse> tickets;
    private Integer quantity;
    private BigDecimal totalCost;
    /** When the cart reservation expires (ISO-8601). Earliest reservedUntil of any ticket in cart. For countdown. */
    private String reservedUntil;
    /** Preferred names for new clients. reservedUntil remains for one compatibility release. */
    private String expiresAt;
    private String serverTime;
    private String message;
    
    public static CartResponse fromCartEntities(List<CartEntity> cartItems, UUID userId, BigDecimal totalCost) {
        if (cartItems == null || cartItems.isEmpty()) {
            return CartResponse.builder()
                    .id(userId)
                    .tickets(new LinkedHashSet<>())
                    .quantity(0)
                    .totalCost(BigDecimal.ZERO)
                    .serverTime(java.time.Instant.now().toString())
                    .build();
        }
        
        Map<String, List<CartEntity>> grouped = new LinkedHashMap<>();
        for (CartEntity row : cartItems) {
            if (row.getTicket() == null) continue;
            var ticket = row.getTicket();
            String key = ticket.getSeatSection() != null
                    ? "seat:" + ticket.getId()
                    : "ga:" + ticket.getEventId() + ":" + ticket.getTicketType();
            grouped.computeIfAbsent(key, ignored -> new ArrayList<>()).add(row);
        }

        Set<CartItemResponse> ticketResponses = new LinkedHashSet<>();
        for (List<CartEntity> rows : grouped.values()) {
            var ticket = rows.get(0).getTicket();
            boolean seat = ticket.getSeatSection() != null;
            String lineExpiry = rows.stream()
                    .map(CartEntity::getTicket)
                    .map(t -> t != null ? t.getReservedUntil() : null)
                    .filter(java.util.Objects::nonNull)
                    .min(java.util.Comparator.naturalOrder())
                    .map(t -> t.toInstant(java.time.ZoneOffset.UTC).toString())
                    .orElse(null);
            ticketResponses.add(CartItemResponse.builder()
                    .kind(seat ? "SEAT" : "GENERAL_ADMISSION")
                    .id(ticket.getId())
                    .ticketId(seat ? ticket.getId() : null)
                    .eventId(ticket.getEventId())
                    .name(ticket.getName())
                    .ticketType(ticket.getTicketType())
                    .ticketStatus(ticket.getTicketStatus())
                    .price(ticket.getPrice())
                    .unitPrice(ticket.getPrice())
                    .startTime(ticket.getStartTime())
                    .endTime(ticket.getEndTime())
                    .eventIdType(ticket.getEventId() != null ? ticket.getEventId().toString() : null)
                    .quantity(rows.size())
                    .expiresAt(lineExpiry)
                    .build());
        }
        
        // Calculate total quantity
        int totalQuantity = cartItems.size();

        // Earliest reservation expiry among all tickets (for countdown)
        java.time.Instant reservedUntil = cartItems.stream()
                .map(ci -> ci.getTicket() != null ? ci.getTicket().getReservedUntil() : null)
                .filter(java.util.Objects::nonNull)
                .map(ldt -> ldt.atZone(java.time.ZoneOffset.UTC).toInstant())
                .min(java.util.Comparator.naturalOrder())
                .orElse(null);
        String reservedUntilStr = reservedUntil != null ? reservedUntil.toString() : null;

        return CartResponse.builder()
                .id(userId)
                .tickets(ticketResponses)
                .quantity(totalQuantity)
                .totalCost(totalCost)
                .reservedUntil(reservedUntilStr)
                .expiresAt(reservedUntilStr)
                .serverTime(java.time.Instant.now().toString())
                .build();
    }
}
