package com.accessplus.eventpro.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Returned after a successful door check-in (QR scan).
 * Gives the check-in app something to display (e.g. "Checked in: John Doe - VIP").
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInResponse {
    private String ticketName;
    private String attendeeName;
    private boolean alreadyCheckedIn;
}
