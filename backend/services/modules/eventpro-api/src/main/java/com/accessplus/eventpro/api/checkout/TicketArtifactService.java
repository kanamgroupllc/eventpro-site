package com.accessplus.eventpro.api.checkout;

import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.event.config.S3Properties;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.event.ticket.repository.TicketRepository;
import com.accessplus.eventpro.event.ticket.service.QRCodeService;
import com.accessplus.eventpro.event.ticket.service.TicketPdfService;
import com.accessplus.eventpro.event.ticket.service.TicketService;
import com.accessplus.eventpro.order.order.repository.OrderItemRepository;
import com.accessplus.eventpro.order.order.service.OrderService;
import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TicketArtifactService {
    private static final String PREFIX = "ticket-artifacts";

    private final S3Client s3Client;
    private final S3Properties s3Properties;
    private final TicketRepository ticketRepository;
    private final EventRepository eventRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderService orderService;
    private final UserRepository userRepository;
    private final TicketService ticketService;
    private final TicketPdfService ticketPdfService;
    private final QRCodeService qrCodeService;
    private final ObjectMapper objectMapper;

    public void issue(UUID ticketId, UUID orderId) throws IOException {
        TicketEntity ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", ticketId.toString()));
        OrderEntity order = orderService.getOrderById(orderId);
        boolean belongsToOrder = order.getOrderItems() != null && order.getOrderItems().stream()
                .anyMatch(item -> ticketId.equals(item.getTicketId()));
        if (!belongsToOrder) throw new IllegalArgumentException("Ticket does not belong to order");
        ticketService.issueTicketQr(ticketId);
        String key = pdfKey(ticketId);
        if (!exists(key)) {
            put(key, ticketPdfService.generateTicketPdf(ticket, recipientName(order), order.getOrderNumber()), "application/pdf");
        }
    }

    public void issueLegacy(UUID ticketId) throws IOException {
        var items = orderItemRepository.findByTicketId(ticketId);
        if (items.isEmpty()) throw new ResourceNotFoundException("Order for ticket", ticketId.toString());
        issue(ticketId, items.getFirst().getOrderId());
    }

    public String createOrderManifest(UUID orderId) throws IOException {
        OrderEntity order = orderService.getOrderById(orderId);
        String email = recipientEmail(order);
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Order has no recipient email");
        }
        if (order.getOrderItems() == null || order.getOrderItems().isEmpty()) {
            throw new IllegalArgumentException("Order has no tickets");
        }

        List<TicketManifestItem> tickets = new ArrayList<>();
        for (var item : order.getOrderItems()) {
            TicketEntity ticket = ticketRepository.findById(item.getTicketId())
                    .orElseThrow(() -> new ResourceNotFoundException("Ticket", item.getTicketId().toString()));
            String pdfKey = pdfKey(ticket.getId());
            if (!exists(pdfKey)) {
                throw new IllegalStateException("Ticket PDF is not ready: " + ticket.getId());
            }
            EventEntity event = eventRepository.findByIdWithAddress(ticket.getEventId())
                    .orElseThrow(() -> new ResourceNotFoundException("Event", ticket.getEventId().toString()));
            tickets.add(new TicketManifestItem(
                    ticket.getId(), event.getName(), event.getStartTime().toInstant(ZoneOffset.UTC).toString(),
                    venue(event), ticket.getTicketType().name(), ticket.getSeatSection(), ticket.getSeatRow(),
                    ticket.getSeatNumber(), ticket.getPrice(), pdfKey, filename(event.getName(), ticket.getId())));
        }

        OrderEmailManifest manifest = new OrderEmailManifest(
                1, order.getId(), order.getOrderNumber(), email, recipientName(order),
                order.getTotalAmount(), "USD", tickets);
        String key = manifestKey(orderId);
        put(key, objectMapper.writeValueAsBytes(manifest), "application/json");
        return key;
    }

    public byte[] getOrCreatePdf(UUID ticketId) throws IOException {
        String key = pdfKey(ticketId);
        byte[] stored = getIfPresent(key);
        if (stored != null) return stored;

        var items = orderItemRepository.findByTicketId(ticketId);
        if (items.isEmpty()) throw new ResourceNotFoundException("Order for ticket", ticketId.toString());
        issue(ticketId, items.getFirst().getOrderId());
        return getRequired(key);
    }

    public byte[] generateQr(UUID ticketId) throws IOException {
        TicketEntity ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", ticketId.toString()));
        if (ticket.getId() == null) throw new IllegalArgumentException("Ticket ID is required");
        return qrCodeService.generateQRCode(ticketId);
    }

    public static String pdfKey(UUID ticketId) { return PREFIX + "/tickets/" + ticketId + "/ticket.pdf"; }
    public static String manifestKey(UUID orderId) { return PREFIX + "/orders/" + orderId + "/manifest-v1.json"; }

    private void put(String key, byte[] bytes, String contentType) {
        s3Client.putObject(PutObjectRequest.builder().bucket(s3Properties.getBucketName()).key(key)
                .contentType(contentType).serverSideEncryption(ServerSideEncryption.AES256).build(), RequestBody.fromBytes(bytes));
    }

    private boolean exists(String key) {
        try {
            s3Client.headObject(HeadObjectRequest.builder().bucket(s3Properties.getBucketName()).key(key).build());
            return true;
        } catch (S3Exception error) {
            if (error.statusCode() == 404) return false;
            throw error;
        }
    }

    private byte[] getIfPresent(String key) throws IOException {
        try {
            return getRequired(key);
        } catch (NoSuchKeyException error) {
            return null;
        } catch (S3Exception error) {
            if (error.statusCode() == 404) return null;
            throw new IOException("Unable to read ticket artifact", error);
        }
    }

    private byte[] getRequired(String key) throws IOException {
        try (var response = s3Client.getObject(GetObjectRequest.builder()
                .bucket(s3Properties.getBucketName()).key(key).build())) {
            return response.readAllBytes();
        }
    }

    private String recipientEmail(OrderEntity order) {
        if (order.getGuestEmail() != null && !order.getGuestEmail().isBlank()) return order.getGuestEmail().trim();
        if (order.getUserId() == null) return null;
        return userRepository.findById(order.getUserId()).map(user -> user.getEmail()).orElse(null);
    }

    private String recipientName(OrderEntity order) {
        String guest = join(order.getGuestFirstName(), order.getGuestLastName());
        if (!guest.isBlank()) return guest;
        if (order.getUserId() != null) {
            return userRepository.findById(order.getUserId())
                    .map(user -> join(user.getFirstName(), user.getLastName())).orElse("Guest");
        }
        return "Guest";
    }

    private static String join(String first, String last) {
        return ((first == null ? "" : first.trim()) + " " + (last == null ? "" : last.trim())).trim();
    }

    private static String venue(EventEntity event) {
        if (event.getAddress() == null) return "Venue TBA";
        return String.join(", ", java.util.stream.Stream.of(event.getAddress().getStreet(), event.getAddress().getCity(),
                        event.getAddress().getState(), event.getAddress().getCountry())
                .filter(value -> value != null && !value.isBlank()).toList());
    }

    private static String filename(String eventName, UUID ticketId) {
        String slug = eventName == null ? "event" : eventName.toLowerCase().replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (slug.isBlank()) slug = "event";
        return slug + "-ticket-" + ticketId.toString().substring(0, 8) + ".pdf";
    }

    public record OrderEmailManifest(int schemaVersion, UUID orderId, String orderNumber, String recipientEmail,
                                     String recipientName, BigDecimal totalAmount, String currency,
                                     List<TicketManifestItem> tickets) {}

    public record TicketManifestItem(UUID ticketId, String eventName, String eventStart, String venue,
                                     String ticketType, String seatSection, String seatRow, Integer seatNumber,
                                     BigDecimal price, String pdfKey, String filename) {}
}
