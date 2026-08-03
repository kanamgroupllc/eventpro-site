package com.accessplus.eventpro.api.service.impl;

import com.accessplus.eventpro.api.service.TaxFormPdfService;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;

/**
 * Generates 1099-K tax form PDF using Apache PDFBox.
 * Produces a summary document with payer, recipient, year, and gross amount (Box 1).
 */
@Slf4j
@Service
public class TaxFormPdfServiceImpl implements TaxFormPdfService {

    private static final String PAYER_NAME = "KanamEvents";

    @Override
    public byte[] generate1099KPdf(String recipientName, String recipientEmail, int year,
                                    BigDecimal grossAmount, BigDecimal feesWithheld,
                                    BigDecimal subscriptionPaymentsForYear) throws IOException {
        log.debug("Generating 1099-K PDF: year={}, recipient={}", year, recipientEmail);
        boolean showFees = feesWithheld != null && feesWithheld.compareTo(BigDecimal.ZERO) > 0;
        boolean showSubscription = subscriptionPaymentsForYear != null && subscriptionPaymentsForYear.compareTo(BigDecimal.ZERO) > 0;
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            float margin = 50;
            float pageWidth = page.getMediaBox().getWidth();
            float pageHeight = page.getMediaBox().getHeight();

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                float y = pageHeight - margin;

                // Title
                cs.beginText();
                cs.setFont(PDType1Font.HELVETICA_BOLD, 18);
                cs.newLineAtOffset(margin, y);
                cs.showText("Form 1099-K - Payment Card and Third Party Network Transactions");
                cs.endText();
                y -= 28;

                cs.beginText();
                cs.setFont(PDType1Font.HELVETICA, 10);
                cs.newLineAtOffset(margin, y);
                cs.showText("This document summarizes gross payment volume for the tax year. Box 1 is required for IRS reporting. Fees may be deductible on your return.");
                cs.endText();
                y -= 36;

                // Payer (Copy B - Payer)
                cs.beginText();
                cs.setFont(PDType1Font.HELVETICA_BOLD, 12);
                cs.newLineAtOffset(margin, y);
                cs.showText("Payer (Payment Settlement Entity)");
                cs.endText();
                y -= 18;
                cs.beginText();
                cs.setFont(PDType1Font.HELVETICA, 11);
                cs.newLineAtOffset(margin, y);
                cs.showText(PAYER_NAME);
                cs.endText();
                y -= 28;

                // Recipient
                cs.beginText();
                cs.setFont(PDType1Font.HELVETICA_BOLD, 12);
                cs.newLineAtOffset(margin, y);
                cs.showText("Recipient");
                cs.endText();
                y -= 18;
                cs.beginText();
                cs.setFont(PDType1Font.HELVETICA, 11);
                cs.newLineAtOffset(margin, y);
                cs.showText(recipientName != null && !recipientName.isBlank() ? recipientName : "—");
                cs.endText();
                y -= 14;
                cs.beginText();
                cs.newLineAtOffset(margin, y);
                cs.showText(recipientEmail != null ? recipientEmail : "—");
                cs.endText();
                y -= 28;

                // Tax year
                cs.beginText();
                cs.setFont(PDType1Font.HELVETICA_BOLD, 12);
                cs.newLineAtOffset(margin, y);
                cs.showText("Tax year");
                cs.endText();
                y -= 18;
                cs.beginText();
                cs.setFont(PDType1Font.HELVETICA, 11);
                cs.newLineAtOffset(margin, y);
                cs.showText(String.valueOf(year));
                cs.endText();
                y -= 28;

                // Gross amount (Box 1)
                cs.beginText();
                cs.setFont(PDType1Font.HELVETICA_BOLD, 12);
                cs.newLineAtOffset(margin, y);
                cs.showText("Box 1 - Gross amount of payment card/third party network transactions");
                cs.endText();
                y -= 18;
                cs.beginText();
                cs.setFont(PDType1Font.HELVETICA, 11);
                cs.newLineAtOffset(margin, y);
                String amountStr = grossAmount != null ? "$" + grossAmount.setScale(2, java.math.RoundingMode.HALF_UP).toString() : "$0.00";
                cs.showText(amountStr);
                cs.endText();
                y -= 22;

                if (showFees) {
                    cs.beginText();
                    cs.setFont(PDType1Font.HELVETICA_BOLD, 11);
                    cs.newLineAtOffset(margin, y);
                    cs.showText("Fees withheld (platform / payment processing) — for your records:");
                    cs.endText();
                    y -= 16;
                    cs.beginText();
                    cs.setFont(PDType1Font.HELVETICA, 11);
                    cs.newLineAtOffset(margin, y);
                    cs.showText("$" + feesWithheld.setScale(2, java.math.RoundingMode.HALF_UP).toString());
                    cs.endText();
                    y -= 18;
                    BigDecimal net = (grossAmount != null ? grossAmount : BigDecimal.ZERO).subtract(feesWithheld);
                    cs.beginText();
                    cs.setFont(PDType1Font.HELVETICA_BOLD, 11);
                    cs.newLineAtOffset(margin, y);
                    cs.showText("Amount after fees (net payout basis):");
                    cs.endText();
                    y -= 16;
                    cs.beginText();
                    cs.setFont(PDType1Font.HELVETICA, 11);
                    cs.newLineAtOffset(margin, y);
                    cs.showText("$" + net.setScale(2, java.math.RoundingMode.HALF_UP).toString());
                    cs.endText();
                    y -= 22;
                }
                if (showSubscription) {
                    cs.beginText();
                    cs.setFont(PDType1Font.HELVETICA_BOLD, 11);
                    cs.newLineAtOffset(margin, y);
                    cs.showText("Subscription/plan fees paid this year (Pro/Enterprise — for your records):");
                    cs.endText();
                    y -= 16;
                    cs.beginText();
                    cs.setFont(PDType1Font.HELVETICA, 11);
                    cs.newLineAtOffset(margin, y);
                    cs.showText("$" + subscriptionPaymentsForYear.setScale(2, java.math.RoundingMode.HALF_UP).toString());
                    cs.endText();
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            byte[] bytes = out.toByteArray();
            log.info("Generated 1099-K PDF: year={}, size={} bytes", year, bytes.length);
            return bytes;
        }
    }
}
