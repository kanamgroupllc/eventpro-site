package com.accessplus.eventpro.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecentSaleResponse {
    private UUID orderId;
    private String buyerName;
    private int quantity;
    private String ticketTypeName;
    private String eventName;
    private LocalDateTime soldAt;
}
