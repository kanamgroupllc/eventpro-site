package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.dto.ApiResponse;
import com.accessplus.eventpro.api.dto.SeatResponse;
import com.accessplus.eventpro.api.dto.TicketTypeResponse;
import com.accessplus.eventpro.api.checkout.CheckoutSessionService;
import com.accessplus.eventpro.api.eventimage.repository.EventImageRepository;
import com.accessplus.eventpro.core.email.service.EmailService;
import com.accessplus.eventpro.core.user.service.UserService;
import com.accessplus.eventpro.event.addon.repository.EventAddonRepository;
import com.accessplus.eventpro.event.category.repository.CategoryRepository;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.event.event.service.EventService;
import com.accessplus.eventpro.event.service.AWSS3ImageService;
import com.accessplus.eventpro.event.ticket.service.TicketService;
import com.accessplus.eventpro.order.cart.service.CartService;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import com.accessplus.eventpro.shared.enums.TicketType;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EventControllerTest {

    @Mock
    private EventService eventService;

    @Mock
    private UserService userService;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private EventRepository eventRepository;

    @Mock
    private EventAddonRepository eventAddonRepository;

    @Mock
    private TicketService ticketService;

    @Mock
    private EmailService emailService;

    @Mock
    private EventImageRepository eventImageRepository;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private AWSS3ImageService imageService;

    @Mock
    private CartService cartService;

    @Mock
    private CheckoutSessionService checkoutSessionService;

    @InjectMocks
    private EventController eventController;

    @Test
    void getTicketTypesReleasesExpiredReservationsBeforeCountingAvailability() {
        UUID eventId = UUID.randomUUID();
        UUID releasedTicketId = UUID.randomUUID();
        EventEntity event = event(eventId, false);
        List<TicketEntity> availableTickets = tickets(eventId, 10, TicketType.REGULAR, TicketStatus.AVAILABLE);
        Map<TicketType, List<TicketEntity>> grouped = new EnumMap<>(TicketType.class);
        grouped.put(TicketType.REGULAR, availableTickets);

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(ticketService.releaseExpiredReservationsForEvent(eventId)).thenReturn(List.of(releasedTicketId));
        when(ticketService.groupTicketsByType(eventId)).thenReturn(grouped);
        when(ticketService.checkTicketAvailability(eventId)).thenReturn(Map.of(TicketType.REGULAR, 10L));

        ResponseEntity<ApiResponse<List<TicketTypeResponse>>> response = eventController.getTicketTypes(eventId);

        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).hasSize(1);
        assertThat(response.getBody().getData().get(0).getAvailableQuantity()).isEqualTo(10);
        verify(ticketService).releaseExpiredReservationsForEvent(eventId);
        verify(cartService).removeCartItemsForTicketIds(List.of(releasedTicketId));
    }

    @Test
    void getEventSeatsReleasesExpiredReservationsBeforeReturningSeatStatuses() {
        UUID eventId = UUID.randomUUID();
        UUID releasedTicketId = UUID.randomUUID();
        TicketEntity seat = ticket(eventId, TicketType.REGULAR, TicketStatus.AVAILABLE);
        seat.setSeatSection("Floor");
        seat.setSeatRow("A");
        seat.setSeatNumber(1);

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event(eventId, true)));
        when(ticketService.releaseExpiredReservationsForEvent(eventId)).thenReturn(List.of(releasedTicketId));
        when(ticketService.getSeatsForEvent(eventId)).thenReturn(List.of(seat));

        ResponseEntity<ApiResponse<List<SeatResponse>>> response = eventController.getEventSeats(eventId);

        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).hasSize(1);
        assertThat(response.getBody().getData().get(0).getStatus()).isEqualTo("AVAILABLE");
        verify(ticketService).releaseExpiredReservationsForEvent(eventId);
        verify(cartService).removeCartItemsForTicketIds(List.of(releasedTicketId));
    }

    private static EventEntity event(UUID eventId, boolean reservedSeatingEnabled) {
        EventEntity event = new EventEntity();
        event.setId(eventId);
        event.setReservedSeatingEnabled(reservedSeatingEnabled);
        return event;
    }

    private static List<TicketEntity> tickets(UUID eventId, int count, TicketType type, TicketStatus status) {
        List<TicketEntity> tickets = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            tickets.add(ticket(eventId, type, status));
        }
        return tickets;
    }

    private static TicketEntity ticket(UUID eventId, TicketType type, TicketStatus status) {
        TicketEntity ticket = new TicketEntity();
        ticket.setId(UUID.randomUUID());
        ticket.setEventId(eventId);
        ticket.setTicketType(type);
        ticket.setTicketStatus(status);
        ticket.setPrice(new BigDecimal("25.00"));
        ticket.setName(type.name());
        return ticket;
    }
}
