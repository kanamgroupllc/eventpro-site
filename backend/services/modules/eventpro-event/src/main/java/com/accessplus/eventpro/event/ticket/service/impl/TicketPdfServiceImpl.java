package com.accessplus.eventpro.event.ticket.service.impl;

import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.event.ticket.service.QRCodeService;
import com.accessplus.eventpro.event.ticket.service.TicketPdfService;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;

/**
 * Implementation of TicketPdfService using Apache PDFBox.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TicketPdfServiceImpl implements TicketPdfService {
    
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' hh:mm a");
    
    private final QRCodeService qrCodeService;
    private final EventRepository eventRepository;
    
    @Override
    public byte[] generateTicketPdf(TicketEntity ticket) throws IOException {
        log.debug("Generating PDF ticket: ticketId={}", ticket.getId());
        
        // Get event information
        EventEntity event = eventRepository.findById(ticket.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event", ticket.getEventId().toString()));
        
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            
            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                // Set up margins and dimensions
                float margin = 50;
                float pageWidth = page.getMediaBox().getWidth();
                float pageHeight = page.getMediaBox().getHeight();
                float contentWidth = pageWidth - (2 * margin);
                
                // Title
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 24);
                contentStream.newLineAtOffset(margin, pageHeight - margin - 30);
                contentStream.showText("EVENT TICKET");
                contentStream.endText();
                
                float yPosition = pageHeight - margin - 80;
                
                // Event Name
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 18);
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText(event.getName());
                contentStream.endText();
                
                yPosition -= 30;
                
                // Event Description (if available)
                if (event.getDescription() != null && !event.getDescription().isEmpty()) {
                    contentStream.beginText();
                    contentStream.setFont(PDType1Font.HELVETICA, 12);
                    contentStream.newLineAtOffset(margin, yPosition);
                    // Truncate description if too long
                    String description = event.getDescription().length() > 100 
                            ? event.getDescription().substring(0, 100) + "..." 
                            : event.getDescription();
                    contentStream.showText(description);
                    contentStream.endText();
                    yPosition -= 25;
                }
                
                yPosition -= 20;
                
                // Ticket Information
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA, 12);
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("Ticket Type: " + ticket.getTicketType().name());
                contentStream.endText();
                
                yPosition -= 20;
                
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA, 12);
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("Ticket ID: " + ticket.getId().toString());
                contentStream.endText();
                
                yPosition -= 20;
                
                // Event Date/Time
                if (event.getStartTime() != null) {
                    contentStream.beginText();
                    contentStream.setFont(PDType1Font.HELVETICA, 12);
                    contentStream.newLineAtOffset(margin, yPosition);
                    contentStream.showText("Event Date: " + event.getStartTime().format(DATE_TIME_FORMATTER));
                    contentStream.endText();
                    yPosition -= 20;
                }
                
                // Price
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 14);
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("Price: $" + ticket.getPrice());
                contentStream.endText();
                
                yPosition -= 60;
                
                // QR Code
                if (ticket.getQrCode() != null || ticket.getId() != null) {
                    try {
                        // Generate QR code image
                        byte[] qrCodeImage = qrCodeService.generateQRCode(ticket.getId());
                        
                        // Create PDImageXObject from QR code bytes
                        PDImageXObject qrCode = PDImageXObject.createFromByteArray(document, qrCodeImage, "qr-code");
                        
                        // Draw QR code (150x150 pixels, centered)
                        float qrSize = 150;
                        float qrX = (pageWidth - qrSize) / 2;
                        float qrY = yPosition - qrSize;
                        
                        contentStream.drawImage(qrCode, qrX, qrY, qrSize, qrSize);
                        
                        // QR Code label
                        contentStream.beginText();
                        contentStream.setFont(PDType1Font.HELVETICA, 10);
                        contentStream.newLineAtOffset(qrX, qrY - 20);
                        contentStream.showText("Scan this QR code at the event");
                        contentStream.endText();
                        
                    } catch (Exception e) {
                        log.warn("Failed to add QR code to PDF: {}", e.getMessage());
                        // Continue without QR code
                    }
                }
                
                // Footer
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA, 8);
                contentStream.newLineAtOffset(margin, margin);
                contentStream.showText("This is your official ticket. Please present this at the event entrance.");
                contentStream.endText();
            }
            
            // Save PDF to byte array
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            document.save(outputStream);
            byte[] pdfBytes = outputStream.toByteArray();
            
            log.info("Successfully generated PDF ticket: ticketId={}, size={} bytes", ticket.getId(), pdfBytes.length);
            return pdfBytes;
            
        } catch (IOException e) {
            log.error("Failed to generate PDF ticket: ticketId={}, error={}", ticket.getId(), e.getMessage(), e);
            throw new IOException("Failed to generate PDF ticket: " + e.getMessage(), e);
        }
    }
}

