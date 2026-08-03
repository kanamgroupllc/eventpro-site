package com.accessplus.eventpro.api.dto;

import com.accessplus.eventpro.event.addon.entity.EventAddonEntity;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EventAddonResponse {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private UUID id;
    private UUID eventId;
    private String name;
    private String description;
    private BigDecimal price;
    private String category;
    private String imageUrl;
    private List<String> sizes;
    private Boolean isPopular;
    private Integer displayOrder;

    public static EventAddonResponse fromEntity(EventAddonEntity entity) {
        if (entity == null) return null;
        List<String> sizes = null;
        if (entity.getSizesJson() != null && !entity.getSizesJson().isBlank()) {
            try {
                String trimmed = entity.getSizesJson().trim();
                if (trimmed.startsWith("[")) {
                    sizes = OBJECT_MAPPER.readValue(trimmed, new TypeReference<>() {});
                } else {
                    sizes = List.of(trimmed.split("\\s*,\\s*"));
                }
            } catch (Exception ignored) {
                sizes = List.of(entity.getSizesJson().split(","));
            }
        }
        return EventAddonResponse.builder()
                .id(entity.getId())
                .eventId(entity.getEvent().getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .price(entity.getPrice())
                .category(entity.getCategory())
                .imageUrl(entity.getImageUrl())
                .sizes(sizes)
                .isPopular(entity.getIsPopular())
                .displayOrder(entity.getDisplayOrder())
                .build();
    }
}
