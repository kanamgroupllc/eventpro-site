package com.accessplus.eventpro.api.dto;

import com.accessplus.eventpro.api.apikey.entity.ApiKeyEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiKeyResponse {

    private UUID id;
    private String name;
    private String keyPrefix;
    private Instant createdAt;

    public static ApiKeyResponse fromEntity(ApiKeyEntity entity) {
        return ApiKeyResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .keyPrefix(entity.getKeyPrefix())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
