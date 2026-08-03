package com.accessplus.eventpro.api.dto;

import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import com.accessplus.eventpro.shared.enums.TicketType;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TicketResponse {
    
    private UUID id;
    private String name;
    private TicketType ticketType;
    private TicketStatus ticketStatus;
    private BigDecimal price;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String qrCode;
    private String printOutUrl;
    private String eventIdType; // Event ID as string for legacy API compatibility
    
    public static TicketResponse fromEntity(TicketEntity entity) {
        if (entity == null) {
            return null;
        }
        
        return TicketResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .ticketType(entity.getTicketType())
                .ticketStatus(entity.getTicketStatus())
                .price(entity.getPrice())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .qrCode(entity.getQrCode())
                .printOutUrl(entity.getPrintOutUrl())
                .eventIdType(entity.getEventId() != null ? entity.getEventId().toString() : null)
                .build();
    }
}

