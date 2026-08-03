package com.accessplus.eventpro.api.service;

import com.accessplus.eventpro.api.dto.AttendeeResponse;
import com.accessplus.eventpro.api.dto.CheckInResponse;
import com.accessplus.eventpro.api.dto.EventStatsResponse;
import com.accessplus.eventpro.api.dto.OrganizerInsightsResponse;
import com.accessplus.eventpro.api.dto.OrganizerSummaryResponse;
import com.accessplus.eventpro.api.dto.RecentSaleResponse;

import java.util.List;
import java.util.UUID;

public interface OrganizerService {

    OrganizerSummaryResponse getOrganizerSummary(UUID organizerId);

    EventStatsResponse getEventStats(UUID eventId, UUID organizerId);

    List<AttendeeResponse> getEventAttendees(UUID eventId, UUID organizerId);

    /**
     * Returns ticket and attendee display info for a ticket (after check-in or for validation).
     * Used by the check-in app to show "Checked in: Name - Ticket type".
     */
    CheckInResponse getCheckInResult(UUID ticketId, UUID organizerId);

    /**
     * Sends an email to all attendees of an event (Pro and Enterprise only).
     * Caller must verify organizer tier before invoking.
     *
     * @return number of recipients the email was sent to
     */
    int emailEventAttendees(UUID eventId, UUID organizerId, String subject, String body);

    /** Export data: type = attendees | checkin | marketing | financial, format = csv. Returns file bytes. */
    byte[] exportData(UUID organizerId, String type, String format);

    List<RecentSaleResponse> getRecentSales(UUID organizerId, int limit);

    OrganizerInsightsResponse getInsights(UUID organizerId);

    /** Gross revenue (from PAID orders) for the organizer in the given calendar year. For 1099-K reporting. */
    java.math.BigDecimal getOrganizerRevenueForYear(UUID organizerId, int year);

    /**
     * Total platform (and payment-processing) fees withheld for the organizer in the given year.
     * Based on stored order platform_fee (or fallback to % of gross). Used for 1099-K "fees withheld" and payouts.
     */
    java.math.BigDecimal getOrganizerFeesForYear(UUID organizerId, int year);

    /**
     * Total subscription/plan fees the organizer paid in the given year (Pro/Enterprise).
     * Separate payments (organizer → platform). For 1099-K "subscription fees paid" line for their records.
     */
    java.math.BigDecimal getOrganizerSubscriptionPaymentsForYear(UUID organizerId, int year);
}

