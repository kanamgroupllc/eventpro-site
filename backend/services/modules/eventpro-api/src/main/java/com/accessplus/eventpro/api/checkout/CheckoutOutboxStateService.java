package com.accessplus.eventpro.api.checkout;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
class CheckoutOutboxStateService {
    private static final int LEASE_MINUTES = 10;
    private final CheckoutOutboxRepository repository;

    @Transactional
    public List<CheckoutOutboxEventEntity> claimDue() {
        LocalDateTime now = now();
        List<CheckoutOutboxEventEntity> events = repository.findDue(now);
        events.forEach(event -> {
            event.setStatus("PROCESSING");
            event.setLeaseUntil(now.plusMinutes(LEASE_MINUTES));
        });
        return repository.saveAll(events).stream().toList();
    }

    @Transactional
    public void complete(UUID eventId) {
        repository.findById(eventId).ifPresent(event -> {
            event.setStatus("COMPLETED");
            event.setLeaseUntil(null);
            event.setLastError(null);
            repository.save(event);
        });
    }

    @Transactional
    public void fail(UUID eventId, Exception error, boolean permanent) {
        repository.findById(eventId).ifPresent(event -> {
            event.setAttempts(event.getAttempts() + 1);
            event.setLastError(message(error));
            event.setLeaseUntil(null);
            if (permanent) {
                event.setStatus("FAILED");
            } else {
                event.setStatus("PENDING");
                long delay = Math.min(300, 1L << Math.min(8, event.getAttempts()));
                event.setNextAttemptAt(now().plusSeconds(delay));
            }
            repository.save(event);
        });
    }

    private static String message(Exception error) {
        String value = error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
        return value.substring(0, Math.min(1000, value.length()));
    }

    private static LocalDateTime now() { return LocalDateTime.now(ZoneOffset.UTC); }
}
