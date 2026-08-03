package com.accessplus.eventpro.order.cart.service.impl;

import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.event.ticket.repository.TicketRepository;
import com.accessplus.eventpro.event.ticket.service.TicketService;
import com.accessplus.eventpro.order.cart.entity.CartEntity;
import com.accessplus.eventpro.order.cart.repository.CartRepository;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.*;
import com.accessplus.eventpro.shared.exception.ValidationException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Clock;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CartServiceImplTest {
    @Mock CartRepository cartRepository;
    @Mock TicketRepository ticketRepository;
    @Mock UserRepository userRepository;
    @Mock TicketService ticketService;
    @Mock EventRepository eventRepository;
    @Spy Clock clock = Clock.systemUTC();
    @InjectMocks CartServiceImpl service;

    private UUID userId;
    private UUID eventId;
    private UserEntity user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        eventId = UUID.randomUUID();
        user = new UserEntity();
        user.setId(userId);
        ReflectionTestUtils.setField(service, "reservationExpiryMinutes", 15);
    }

    @Test
    void addThreeCreatesThreePhysicalRowsWithOneSharedDeadline() {
        EventEntity event = new EventEntity();
        event.setId(eventId);
        event.setEndTime(LocalDateTime.now().plusDays(1));
        List<UUID> ids = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        List<CartEntity> resultRows = new ArrayList<>();
        for (UUID id : ids) resultRows.add(row(ticket(id, TicketStatus.RESERVED, null)));

        when(userRepository.findByIdForUpdate(userId)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserIdAndExpiredReservation(eq(userId), eq(TicketStatus.RESERVED), any())).thenReturn(List.of());
        when(cartRepository.findGeneralAdmissionLine(userId, eventId, TicketType.REGULAR))
                .thenReturn(List.of(), List.of(), resultRows);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(cartRepository.findByUserIdForUpdate(userId)).thenReturn(List.of());
        when(ticketService.findAndReserveAvailableTickets(eq(eventId), eq(TicketType.REGULAR), eq(3), any()))
                .thenReturn(ids);
        ids.forEach(id -> when(ticketRepository.findById(id)).thenReturn(Optional.of(ticket(id, TicketStatus.RESERVED, null))));
        when(cartRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<CartEntity> result = service.addGeneralAdmission(userId, eventId, TicketType.REGULAR, 3);

        assertEquals(3, result.size());
        ArgumentCaptor<CartEntity> rows = ArgumentCaptor.forClass(CartEntity.class);
        verify(cartRepository, times(3)).save(rows.capture());
        assertTrue(rows.getAllValues().stream().allMatch(r -> r.getQuantity() == 1));
        ArgumentCaptor<LocalDateTime> deadline = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(ticketService).findAndReserveAvailableTickets(eq(eventId), eq(TicketType.REGULAR), eq(3), deadline.capture());
        assertTrue(deadline.getValue().isAfter(LocalDateTime.now().plusMinutes(14)));
    }

    @Test
    void reducingThreeToOneReleasesExactlyTwoPhysicalTickets() {
        List<CartEntity> three = List.of(
                row(ticket(UUID.randomUUID(), TicketStatus.RESERVED, LocalDateTime.now().plusMinutes(10))),
                row(ticket(UUID.randomUUID(), TicketStatus.RESERVED, LocalDateTime.now().plusMinutes(10))),
                row(ticket(UUID.randomUUID(), TicketStatus.RESERVED, LocalDateTime.now().plusMinutes(10))));
        when(userRepository.findByIdForUpdate(userId)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserIdAndExpiredReservation(eq(userId), eq(TicketStatus.RESERVED), any())).thenReturn(List.of());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        EventEntity event = new EventEntity(); event.setEndTime(LocalDateTime.now().plusDays(1));
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(cartRepository.findGeneralAdmissionLine(userId, eventId, TicketType.VIP))
                .thenReturn(three, List.of(three.get(0)));

        List<CartEntity> result = service.setGeneralAdmissionQuantity(userId, eventId, TicketType.VIP, 1);

        assertEquals(1, result.size());
        verify(cartRepository, times(2)).delete(any(CartEntity.class));
        assertEquals(1, three.stream().filter(r -> r.getTicket().getTicketStatus() == TicketStatus.RESERVED).count());
        assertEquals(2, three.stream().filter(r -> r.getTicket().getTicketStatus() == TicketStatus.AVAILABLE).count());
    }

    @Test
    void laterAdditionInheritsExistingCartDeadline() {
        LocalDateTime fixed = LocalDateTime.now().plusMinutes(7);
        CartEntity existingOtherType = row(ticket(UUID.randomUUID(), TicketStatus.RESERVED, fixed));
        EventEntity event = new EventEntity(); event.setEndTime(LocalDateTime.now().plusDays(1));
        UUID newId = UUID.randomUUID();
        when(userRepository.findByIdForUpdate(userId)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserIdAndExpiredReservation(eq(userId), eq(TicketStatus.RESERVED), any())).thenReturn(List.of());
        when(cartRepository.findGeneralAdmissionLine(userId, eventId, TicketType.EARLY_BIRD))
                .thenReturn(List.of(), List.of(), List.of(row(ticket(newId, TicketStatus.RESERVED, fixed))));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(cartRepository.findByUserIdForUpdate(userId)).thenReturn(List.of(existingOtherType));
        when(ticketService.findAndReserveAvailableTickets(eventId, TicketType.EARLY_BIRD, 1, fixed)).thenReturn(List.of(newId));
        when(ticketRepository.findById(newId)).thenReturn(Optional.of(ticket(newId, TicketStatus.RESERVED, fixed)));
        when(cartRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.addGeneralAdmission(userId, eventId, TicketType.EARLY_BIRD, 1);
        verify(ticketService).findAndReserveAvailableTickets(eventId, TicketType.EARLY_BIRD, 1, fixed);
    }

    @Test
    void expiryReleasesEveryPhysicalRowAtBoundary() {
        CartEntity a = row(ticket(UUID.randomUUID(), TicketStatus.RESERVED, LocalDateTime.now()));
        CartEntity b = row(ticket(UUID.randomUUID(), TicketStatus.RESERVED, LocalDateTime.now()));
        when(cartRepository.findByUserIdAndExpiredReservation(eq(userId), eq(TicketStatus.RESERVED), any()))
                .thenReturn(List.of(a, b));

        assertEquals(2, service.releaseExpiredCartReservations(userId));
        assertEquals(TicketStatus.AVAILABLE, a.getTicket().getTicketStatus());
        assertEquals(TicketStatus.AVAILABLE, b.getTicket().getTicketStatus());
        verify(cartRepository, times(2)).delete(any(CartEntity.class));
    }

    @Test
    void gaQuantityAboveFourIsRejected() {
        when(userRepository.findByIdForUpdate(userId)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserIdAndExpiredReservation(eq(userId), eq(TicketStatus.RESERVED), any())).thenReturn(List.of());
        assertThrows(ValidationException.class,
                () -> service.setGeneralAdmissionQuantity(userId, eventId, TicketType.REGULAR, 5));
    }

    @Test
    void cartTotalCountsPhysicalRowsNotSyntheticQuantity() {
        TicketEntity a = ticket(UUID.randomUUID(), TicketStatus.RESERVED, null); a.setPrice(new BigDecimal("50.00"));
        TicketEntity b = ticket(UUID.randomUUID(), TicketStatus.RESERVED, null); b.setPrice(new BigDecimal("75.00"));
        when(userRepository.existsById(userId)).thenReturn(true);
        when(cartRepository.findByUserId(userId)).thenReturn(List.of(row(a), row(b)));
        assertEquals(new BigDecimal("125.00"), service.calculateCartTotal(userId));
        assertEquals(2, service.getCartItemCount(userId));
    }

    private CartEntity row(TicketEntity ticket) {
        CartEntity row = new CartEntity(); row.setUser(user); row.setTicket(ticket); row.setQuantity(1); return row;
    }

    private TicketEntity ticket(UUID id, TicketStatus status, LocalDateTime deadline) {
        TicketEntity ticket = new TicketEntity();
        ticket.setId(id); ticket.setEventId(eventId); ticket.setTicketType(TicketType.REGULAR);
        ticket.setTicketStatus(status); ticket.setReservedUntil(deadline); ticket.setPrice(new BigDecimal("25.00"));
        return ticket;
    }
}
