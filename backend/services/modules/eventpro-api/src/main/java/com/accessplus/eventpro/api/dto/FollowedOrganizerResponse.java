package com.accessplus.eventpro.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** Minimal organizer info for "Following" list. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowedOrganizerResponse {

    private UUID organizerId;
    private String firstName;
    private String lastName;
    private String profilePictureUrl;
}
