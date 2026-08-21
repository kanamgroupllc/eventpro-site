package com.accessplus.eventpro.notification.service.impl;

import com.accessplus.eventpro.notification.service.EmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class EmailServiceImplTest {
    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) server.stop(0);
    }

    @Test
    void sendsResendJsonWithAttachmentAndIdempotencyHeader() throws Exception {
        AtomicReference<String> body = new AtomicReference<>();
        AtomicReference<String> idempotency = new AtomicReference<>();
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/emails", exchange -> {
            body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            idempotency.set(exchange.getRequestHeaders().getFirst("Idempotency-Key"));
            byte[] response = "{\"id\":\"resend-123\"}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();
        EmailServiceImpl service = new EmailServiceImpl(mock(SecretsManagerClient.class), new ObjectMapper(),
                "local-test-key", "", "Abcham <noreply@mail.abcham.com>", "kanamgroupllc@gmail.com",
                "http://127.0.0.1:" + server.getAddress().getPort() + "/emails");

        String id = service.sendEmail("buyer@example.com", "Tickets", "<p>Ready</p>", "Ready",
                List.of(new EmailService.EmailAttachment("ticket.pdf", new byte[]{1, 2, 3})), "order-email/id/1");

        assertEquals("resend-123", id);
        assertEquals("order-email/id/1", idempotency.get());
        assertTrue(body.get().contains("noreply@mail.abcham.com"));
        assertTrue(body.get().contains("ticket.pdf"));
        assertTrue(body.get().contains("application/pdf"));
        assertFalse(body.get().contains("local-test-key"));
    }
}
