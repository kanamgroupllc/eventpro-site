package com.accessplus.eventpro.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

import java.util.List;
import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class NotificationSenderServiceTest {
    @Test
    void acceptsLegacyPaymentSuccessTimestampAndInAppDelivery() throws Exception {
        SMSService sms = mock(SMSService.class);
        EmailService email = mock(EmailService.class);
        NotificationSenderService service = new NotificationSenderService(
                email, sms, new ObjectMapper(), mock(TicketManifestReader.class),
                new DeliveryLedger(mock(DynamoDbClient.class), ""));
        String message = """
                {"messageId":"7b931b43-2457-4f4b-ac32-7c29bf8e7ec9",
                "messageType":"PAYMENT_SUCCESS","timestamp":[2026,8,16,12,0],"source":"payment-processor",
                "payload":{"deliveryTypes":["IN_APP"],"templateData":{"orderNumber":"ORD-1"}}}
                """;

        service.sendNotification(message);

        verifyNoInteractions(email, sms);
    }

    @Test
    void escapesCustomTextAndDeduplicatesACompletedDelivery() throws Exception {
        EmailService email = mock(EmailService.class);
        when(email.sendEmail(anyString(), anyString(), anyString(), anyString(), anyList(), anyString()))
                .thenReturn("resend-id");
        NotificationSenderService service = new NotificationSenderService(
                email, mock(SMSService.class), new ObjectMapper(), mock(TicketManifestReader.class),
                new DeliveryLedger(mock(DynamoDbClient.class), ""));
        String message = """
                {"schemaVersion":2,"messageId":"7b931b43-2457-4f4b-ac32-7c29bf8e7ec9",
                "messageType":"CUSTOM_EMAIL","timestamp":"2026-08-16T12:00:00Z","source":"test",
                "payload":{"email":"buyer@example.com","deliveryTypes":["EMAIL"],
                "subject":"Update","textBody":"Hello <script>alert(1)</script>"}}
                """;

        service.sendNotification(message);
        service.sendNotification(message);

        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        verify(email, times(1)).sendEmail(eq("buyer@example.com"), eq("Update"), html.capture(),
                contains("<script>"), eq(List.of()), eq("email/7b931b43-2457-4f4b-ac32-7c29bf8e7ec9/1"));
        assertTrue(html.getValue().contains("&lt;script&gt;"));
    }

    @Test
    void loadsTicketManifestAndAttachesEachPhysicalTicketPdf() throws Exception {
        EmailService email = mock(EmailService.class);
        when(email.sendEmail(anyString(), anyString(), anyString(), anyString(), anyList(), anyString()))
                .thenReturn("resend-ticket-id");
        TicketManifestReader reader = mock(TicketManifestReader.class);
        UUID orderId = UUID.randomUUID();
        UUID ticketId = UUID.randomUUID();
        String manifestKey = "ticket-artifacts/orders/" + orderId + "/manifest-v1.json";
        var ticket = new TicketManifestReader.TicketManifestItem(ticketId, "Festival", "2026-09-01T20:00:00Z",
                "123 Main St", "VIP", "Orchestra", "A", 1, new BigDecimal("25.00"),
                "ticket-artifacts/tickets/" + ticketId + "/ticket.pdf", "festival-ticket.pdf");
        when(reader.read(manifestKey)).thenReturn(
                new TicketManifestReader.OrderEmailManifest(1, orderId, "ORD-1", "buyer@example.com", "Buyer",
                        new BigDecimal("25.00"), "USD", List.of(ticket)));
        when(reader.readAttachment(ticket.pdfKey())).thenReturn(new byte[]{1, 2, 3});
        NotificationSenderService service = new NotificationSenderService(email, mock(SMSService.class),
                new ObjectMapper(), reader, new DeliveryLedger(mock(DynamoDbClient.class), ""));
        String message = """
                {"schemaVersion":2,"messageId":"7b931b43-2457-4f4b-ac32-7c29bf8e7ec9",
                "messageType":"ORDER_TICKETS","timestamp":"2026-08-16T12:00:00Z","source":"test",
                "payload":{"email":"buyer@example.com","deliveryTypes":["EMAIL"],
                "manifestKey":"%s"}}
                """;
        message = message.formatted(manifestKey);

        service.sendNotification(message);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<EmailService.EmailAttachment>> attachments = ArgumentCaptor.forClass(List.class);
        verify(email).sendEmail(eq("buyer@example.com"), contains("ORD-1"), contains("Festival"),
                contains("Festival"), attachments.capture(), eq("order-email/7b931b43-2457-4f4b-ac32-7c29bf8e7ec9/1"));
        assertTrue(attachments.getValue().size() == 1);
        assertTrue(attachments.getValue().getFirst().filename().equals("festival-ticket.pdf"));
    }
}
