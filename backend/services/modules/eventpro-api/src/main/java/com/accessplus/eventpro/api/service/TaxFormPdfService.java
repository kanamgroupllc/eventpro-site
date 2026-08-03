package com.accessplus.eventpro.api.service;

import java.io.IOException;

/**
 * Generates 1099-K tax form PDF for an organizer for a given year.
 */
public interface TaxFormPdfService {

    /**
     * Generates 1099-K form PDF for the given organizer and tax year.
     *
     * @param recipientName            Organizer display name (e.g. first + last or email)
     * @param recipientEmail           Organizer email
     * @param year                     Tax year (e.g. 2025)
     * @param grossAmount              Gross payment amount for the year (IRS 1099-K Box 1)
     * @param feesWithheld             Total fees withheld from ticket sales (platform + per-ticket); if null or zero, not shown
     * @param subscriptionPaymentsForYear Total subscription/plan fees the organizer paid this year (Pro/Enterprise); if null or zero, not shown
     * @return PDF bytes
     */
    byte[] generate1099KPdf(String recipientName, String recipientEmail, int year,
                            java.math.BigDecimal grossAmount, java.math.BigDecimal feesWithheld,
                            java.math.BigDecimal subscriptionPaymentsForYear) throws IOException;
}
