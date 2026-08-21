package com.accessplus.eventpro.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class TicketManifestReader {
    private final S3Client s3Client;
    private final ObjectMapper objectMapper;
    private final String bucket;

    public TicketManifestReader(S3Client s3Client, ObjectMapper objectMapper,
                                @Value("${ticket-artifacts.bucket:}") String bucket) {
        this.s3Client = s3Client;
        this.objectMapper = objectMapper;
        this.bucket = bucket;
    }

    public OrderEmailManifest read(String key) throws Exception {
        if (bucket == null || bucket.isBlank()) throw new IllegalStateException("TICKET_ARTIFACTS_BUCKET is required");
        if (key == null || !key.matches("^ticket-artifacts/orders/[0-9a-fA-F-]{36}/manifest-v1\\.json$")) {
            throw new IllegalArgumentException("Invalid order manifest key");
        }
        try (var response = s3Client.getObject(GetObjectRequest.builder().bucket(bucket).key(key).build())) {
            OrderEmailManifest manifest = objectMapper.readValue(response, OrderEmailManifest.class);
            if (manifest.schemaVersion() != 1) throw new IllegalArgumentException("Unsupported order manifest version");
            if (manifest.tickets() == null || manifest.tickets().isEmpty()) {
                throw new IllegalArgumentException("Order manifest contains no tickets");
            }
            return manifest;
        }
    }

    public byte[] readAttachment(String key) throws Exception {
        if (key == null || !key.matches("^ticket-artifacts/tickets/[0-9a-fA-F-]{36}/ticket\\.pdf$")) {
            throw new IllegalArgumentException("Invalid ticket attachment key");
        }
        try (var response = s3Client.getObject(GetObjectRequest.builder().bucket(bucket).key(key).build())) {
            return response.readAllBytes();
        }
    }

    public record OrderEmailManifest(int schemaVersion, UUID orderId, String orderNumber, String recipientEmail,
                                     String recipientName, BigDecimal totalAmount, String currency,
                                     List<TicketManifestItem> tickets) {}
    public record TicketManifestItem(UUID ticketId, String eventName, String eventStart, String venue,
                                     String ticketType, String seatSection, String seatRow, Integer seatNumber,
                                     BigDecimal price, String pdfKey, String filename) {}
}
