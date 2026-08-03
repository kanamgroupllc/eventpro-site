package com.accessplus.eventpro.api.dto;

import com.accessplus.eventpro.shared.enums.EventStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UpdateEventRequest {
    
    private String name;
    private String description;
    private String imageUrl;
    private String promotionalVideoUrl;
    private String eventPageTemplate;
    private Boolean marketingEnabled;
    private Boolean donationsEnabled;
    private String customDomain;
    private Boolean reservedSeatingEnabled;
    private EventStatus status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String userId; // UUID as string
    private String category; // UUID or category name

    @Valid
    private AddressDto address;
}

