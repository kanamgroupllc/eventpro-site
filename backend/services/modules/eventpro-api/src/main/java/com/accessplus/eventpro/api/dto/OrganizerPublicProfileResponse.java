package com.accessplus.eventpro.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Public display profile for an organizer (name, photo only).
 * Used when showing organizer on event detail; data comes from the organizer's profile.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OrganizerPublicProfileResponse {
    private UUID id;
    private String firstName;
    private String lastName;
    private String profilePictureUrl;
}
