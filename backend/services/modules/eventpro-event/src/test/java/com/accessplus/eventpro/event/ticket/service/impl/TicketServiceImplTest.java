package com.accessplus.eventpro.event.ticket.service.impl;

import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.event.ticket.repository.TicketRepository;
import com.accessplus.eventpro.event.ticket.service.QRCodeService;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.Clock;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TicketServiceImplTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private EventRepository eventRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private QRCodeService qrCodeService;

    @Spy
    private Clock clock = Clock.systemUTC();

    @InjectMocks
    private TicketServiceImpl ticketService;

    @Test
    void releaseExpiredReservationsMakesReservedTicketsAvailableAndClearsExpiry() {
        TicketEntity expired = ticket(UUID.randomUUID(), TicketStatus.RESERVED, LocalDateTime.now().minusMinutes(1));
        when(ticketRepository.findReservedWithExpiredHold(any(LocalDateTime.class))).thenReturn(List.of(expired));

        List<UUID> releasedIds = ticketService.releaseExpiredReservations();

        assertThat(releasedIds).containsExactly(expired.getId());
        assertThat(expired.getTicketStatus()).isEqualTo(TicketStatus.AVAILABLE);
        assertThat(expired.getReservedUntil()).isNull();
        verify(ticketRepository).save(expired);
    }

    @Test
    void releaseExpiredReservationsForEventUsesEventScopedQuery() {
        UUID eventId = UUID.randomUUID();
        TicketEntity expired = ticket(eventId, TicketStatus.RESERVED, LocalDateTime.now().minusMinutes(1));
        when(ticketRepository.findReservedWithExpiredHoldForEvent(eq(eventId), any(LocalDateTime.class)))
                .thenReturn(List.of(expired));

        List<UUID> releasedIds = ticketService.releaseExpiredReservationsForEvent(eventId);

        assertThat(releasedIds).containsExactly(expired.getId());
        assertThat(expired.getTicketStatus()).isEqualTo(TicketStatus.AVAILABLE);
        assertThat(expired.getReservedUntil()).isNull();
        verify(ticketRepository).save(expired);
    }

    @Test
    void releaseExpiredReservationsDoesNothingWhenNoExpiredReservationsExist() {
        when(ticketRepository.findReservedWithExpiredHold(any(LocalDateTime.class))).thenReturn(List.of());

        List<UUID> releasedIds = ticketService.releaseExpiredReservations();

        assertThat(releasedIds).isEmpty();
        verify(ticketRepository, never()).save(any(TicketEntity.class));
    }

    @Test
    void releaseExpiredReservationsNeverReleasesSoldTicketsDefensively() {
        TicketEntity sold = ticket(UUID.randomUUID(), TicketStatus.SOLD, LocalDateTime.now().minusMinutes(30));
        when(ticketRepository.findReservedWithExpiredHold(any(LocalDateTime.class))).thenReturn(List.of(sold));

        List<UUID> releasedIds = ticketService.releaseExpiredReservations();

        assertThat(releasedIds).isEmpty();
        assertThat(sold.getTicketStatus()).isEqualTo(TicketStatus.SOLD);
        assertThat(sold.getReservedUntil()).isNotNull();
        verify(ticketRepository, never()).save(any(TicketEntity.class));
    }

    private static TicketEntity ticket(UUID eventId, TicketStatus status, LocalDateTime reservedUntil) {
        TicketEntity ticket = new TicketEntity();
        ticket.setId(UUID.randomUUID());
        ticket.setEventId(eventId);
        ticket.setTicketStatus(status);
        ticket.setReservedUntil(reservedUntil);
        return ticket;
    }
}
