package com.accessplus.eventpro.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CreateEventRequest {
    
    @NotBlank(message = "Event name is required")
    private String name;
    
    private String description;
    
    @NotNull(message = "Event start time is required")
    private LocalDateTime startTime;
    
    @NotNull(message = "Event end time is required")
    private LocalDateTime endTime;
    
    @Builder.Default
    private Boolean marketingEnabled = false;

    /** Optional promotional video URL (e.g. YouTube/Vimeo) for event detail page. All tiers. */
    private String promotionalVideoUrl;

    /** Event page template: DEFAULT, MINIMAL, VIBRANT. Defaults to DEFAULT. All tiers. */
    @Builder.Default
    private String eventPageTemplate = "DEFAULT";

    /** Pro/Enterprise only: enable optional donation at checkout. */
    @Builder.Default
    private Boolean donationsEnabled = false;

    /** Pro/Enterprise only: custom domain hostname (e.g. tickets.churchname.org). */
    private String customDomain;

    /** Pro/Enterprise only: enable reserved seating (seat map). */
    @Builder.Default
    private Boolean reservedSeatingEnabled = false;

    @NotNull(message = "Category is required")
    private String category; // Can be UUID or category name
    
    @Valid
    @NotNull(message = "Address is required")
    private AddressDto address;
}

