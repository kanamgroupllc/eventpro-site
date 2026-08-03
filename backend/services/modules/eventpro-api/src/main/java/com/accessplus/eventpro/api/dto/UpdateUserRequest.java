package com.accessplus.eventpro.api.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {
    
    @Size(max = 100, message = "First name must not exceed 100 characters")
    private String firstName;
    
    @Size(max = 100, message = "Last name must not exceed 100 characters")
    private String lastName;
    
    // Note: phoneNumber validation can be added if needed
    // @Pattern(regexp = "^\\+?[1-9]\\d{1,14}$", message = "Invalid phone number format")
    private String phoneNumber;
    
    @Size(max = 1000, message = "Bio must not exceed 1000 characters")
    private String bio;
    
    @Size(max = 255, message = "Location must not exceed 255 characters")
    private String location;

    @Size(max = 255, message = "Cultural niche must not exceed 255 characters")
    private String culturalNiche;

    /** White-label: custom logo URL (Pro/Enterprise). */
    @Size(max = 500)
    private String brandingLogoUrl;

    /** White-label: primary color hex e.g. #1a1a2e (Pro/Enterprise). */
    @Size(max = 20)
    private String brandingPrimaryColor;

    /** White-label: hide platform branding on event pages (Pro/Enterprise). */
    private Boolean brandingHidePlatform;
}

