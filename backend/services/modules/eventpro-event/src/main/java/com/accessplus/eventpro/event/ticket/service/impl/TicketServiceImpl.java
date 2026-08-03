package com.accessplus.eventpro.event.ticket.service.impl;

import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.shared.exception.ValidationException;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import com.accessplus.eventpro.shared.enums.TicketType;
import com.accessplus.eventpro.event.ticket.repository.TicketRepository;
import com.accessplus.eventpro.event.ticket.service.QRCodeService;
import com.accessplus.eventpro.event.ticket.service.TicketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Clock;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Implementation of TicketService.
 * Handles ticket CRUD operations with QR code generation support.
 * 
 * <p>Features:
 * <ul>
 *   <li>Bulk ticket creation for events</li>
 *   <li>Ticket updates and deletion</li>
 *   <li>Ticket retrieval by event, type, status</li>
 *   <li>Ticket grouping by type</li>
 *   <li>Ticket availability checking</li>
 *   <li>QR code generation when tickets are sold</li>
 *   <li>Ticket status management (AVAILABLE, RESERVED, SOLD)</li>
 *   <li>Validation of ticket data and relationships</li>
 *   <li>Proper error handling and logging</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class TicketServiceImpl implements TicketService {

    @Value("${eventpro.ticket.reservation-expiry-minutes:15}")
    private int reservationExpiryMinutes;

    private final TicketRepository ticketRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final QRCodeService qrCodeService;
    private final Clock clock;

    /**
     * Creates multiple tickets for an event in bulk.
     */
    @Override
    public List<TicketEntity> createTickets(
            UUID eventId,
            UUID creatorId,
            TicketType ticketType,
            BigDecimal price,
            int quantity,
            String name,
            LocalDateTime startTime,
            LocalDateTime endTime) {
        log.debug("Creating tickets: eventId={}, creatorId={}, type={}, price={}, quantity={}", 
                eventId, creatorId, ticketType, price, quantity);

        // Validate and fetch event
        EventEntity event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));

        // Validate and fetch creator
        UserEntity creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", creatorId.toString()));

        // Validate inputs
        if (quantity <= 0) {
            throw new ValidationException("Quantity must be greater than 0");
        }
        if (price == null || price.compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("Price must be non-negative");
        }
        if (startTime != null && endTime != null && endTime.isBefore(startTime)) {
            throw new ValidationException("End time must be after start time");
        }

        // Generate ticket name if not provided
        String ticketName = name != null && !name.trim().isEmpty() 
                ? name 
                : String.format("%s - %s", event.getName(), ticketType.name());

        // Create tickets
        List<TicketEntity> tickets = new ArrayList<>();
        for (int i = 0; i < quantity; i++) {
            TicketEntity ticket = new TicketEntity();
            ticket.setName(ticketName);
            ticket.setPrice(price);
            ticket.setTicketType(ticketType);
            ticket.setTicketStatus(TicketStatus.AVAILABLE);
            ticket.setStartTime(startTime);
            ticket.setEndTime(endTime);
            ticket.setEventId(event.getId());
            ticket.setCreatorId(creator.getId());
            // purchaser is null until ticket is sold

            tickets.add(ticket);
        }

        // Save all tickets
        List<TicketEntity> savedTickets = ticketRepository.saveAll(tickets);
        log.info("Successfully created {} tickets for event: eventId={}, type={}", 
                savedTickets.size(), eventId, ticketType);

        return savedTickets;
    }

    /**
     * Updates an existing ticket.
     */
    @Override
    public TicketEntity updateTicket(
            UUID ticketId,
            String name,
            BigDecimal price,
            TicketType ticketType,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String printOutUrl) {
        log.debug("Updating ticket: id={}", ticketId);

        // Fetch existing ticket
        TicketEntity ticket = ticketRepository.findByIdForUpdate(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", ticketId.toString()));

        if (ticket.getSeatSection() == null) {
            if (ticket.getTicketStatus() != TicketStatus.AVAILABLE) {
                throw new ValidationException("Only available GA ticket groups can be edited");
            }
            if (ticketType != null && ticketType != ticket.getTicketType()) {
                throw new ValidationException("GA ticket type cannot be changed by an individual-ticket update");
            }
            List<TicketEntity> group = ticketRepository.findGeneralAdmissionGroupForUpdate(
                    ticket.getEventId(), ticket.getTicketType().name());
            if (group.stream().anyMatch(t -> t.getTicketStatus() == TicketStatus.RESERVED)) {
                throw new ValidationException("GA ticket group cannot be edited while it has active holds");
            }
            for (TicketEntity member : group) {
                if (member.getTicketStatus() == TicketStatus.AVAILABLE) {
                    applyCommercialUpdate(member, name, price, null, startTime, endTime, printOutUrl);
                }
            }
            ticketRepository.saveAll(group);
            return ticket;
        }

        applyCommercialUpdate(ticket, name, price, ticketType, startTime, endTime, printOutUrl);

        TicketEntity updatedTicket = ticketRepository.save(ticket);
        log.info("Successfully updated ticket: id={}", ticketId);
        return updatedTicket;
    }

    private void applyCommercialUpdate(TicketEntity ticket, String name, BigDecimal price,
                                       TicketType ticketType, LocalDateTime startTime,
                                       LocalDateTime endTime, String printOutUrl) {
        if (name != null && !name.trim().isEmpty()) {
            ticket.setName(name);
        }
        if (price != null) {
            if (price.compareTo(BigDecimal.ZERO) < 0) {
                throw new ValidationException("Price must be non-negative");
            }
            ticket.setPrice(price);
        }
        if (ticketType != null) {
            ticket.setTicketType(ticketType);
        }
        if (startTime != null) {
            ticket.setStartTime(startTime);
        }
        if (endTime != null) {
            ticket.setEndTime(endTime);
        }
        if (printOutUrl != null) {
            ticket.setPrintOutUrl(printOutUrl);
        }

        // Validate time constraints
        if (ticket.getStartTime() != null && ticket.getEndTime() != null 
                && ticket.getEndTime().isBefore(ticket.getStartTime())) {
            throw new ValidationException("End time must be after start time");
        }

    }

    /**
     * Deletes a ticket by ID.
     */
    @Override
    public void deleteTicket(UUID ticketId) {
        log.debug("Deleting ticket: id={}", ticketId);

        // Check if ticket exists
        if (!ticketRepository.existsById(ticketId)) {
            throw new ResourceNotFoundException("Ticket", ticketId.toString());
        }

        // Delete ticket (cascade will handle related entities if needed)
        ticketRepository.deleteById(ticketId);
        log.info("Successfully deleted ticket: id={}", ticketId);
    }

    /**
     * Retrieves a ticket by ID.
     */
    @Override
    @Transactional(readOnly = true)
    public TicketEntity getTicketById(UUID ticketId) {
        log.debug("Getting ticket by ID: {}", ticketId);

        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", ticketId.toString()));
    }

    /**
     * Retrieves all tickets for an event with pagination.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<TicketEntity> getTicketsByEvent(UUID eventId, Pageable pageable) {
        log.debug("Getting tickets for event: eventId={}, page={}, size={}", 
                eventId, pageable.getPageNumber(), pageable.getPageSize());

        // Validate event exists
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event", eventId.toString());
        }

        return ticketRepository.findByEventId(eventId, pageable);
    }

    /**
     * Groups tickets by type for an event.
     */
    @Override
    @Transactional(readOnly = true)
    public Map<TicketType, List<TicketEntity>> groupTicketsByType(UUID eventId) {
        log.debug("Grouping tickets by type for event: eventId={}", eventId);

        // Validate event exists
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event", eventId.toString());
        }

        // Get all tickets for the event (no pagination for grouping)
        Pageable pageable = org.springframework.data.domain.PageRequest.of(0, Integer.MAX_VALUE);
        List<TicketEntity> tickets = ticketRepository.findByEventId(eventId, pageable).getContent();

        // Group by ticket type
        Map<TicketType, List<TicketEntity>> groupedTickets = tickets.stream()
                .collect(Collectors.groupingBy(TicketEntity::getTicketType));

        log.debug("Grouped {} tickets by type for event: eventId={}", tickets.size(), eventId);
        return groupedTickets;
    }

    /**
     * Checks ticket availability for an event.
     */
    @Override
    @Transactional(readOnly = true)
    public Map<TicketType, Long> checkTicketAvailability(UUID eventId) {
        log.debug("Checking ticket availability for event: eventId={}", eventId);

        // Validate event exists
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event", eventId.toString());
        }

        // Count available tickets by type
        Map<TicketType, Long> availability = new HashMap<>();
        for (TicketType type : TicketType.values()) {
            // Get all tickets of this type for the event
            Pageable pageable = org.springframework.data.domain.PageRequest.of(0, Integer.MAX_VALUE);
            long availableCount = ticketRepository.findByEventIdAndTicketType(eventId, type.name(), pageable)
                    .getContent()
                    .stream()
                    .filter(t -> t.getTicketStatus() == TicketStatus.AVAILABLE)
                    .count();
            availability.put(type, availableCount);
        }

        log.debug("Ticket availability for event: eventId={}, availability={}", eventId, availability);
        return availability;
    }

    /**
     * Marks a ticket as sold and generates QR code.
     * For guest orders, purchaserId may be null.
     */
    @Override
    public TicketEntity markTicketAsSold(UUID ticketId, UUID purchaserId) throws IOException {
        log.debug("Marking ticket as sold: ticketId={}, purchaserId={}", ticketId, purchaserId);

        TicketEntity ticket = ticketRepository.findByIdForUpdate(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", ticketId.toString()));

        if (ticket.getTicketStatus() != TicketStatus.RESERVED) {
            throw new IllegalStateException("Ticket must be reserved before it can be sold");
        }

        ticket.setTicketStatus(TicketStatus.SOLD);
        ticket.setReservedUntil(null);
        if (purchaserId != null) {
            UserEntity purchaser = userRepository.findById(purchaserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", purchaserId.toString()));
            ticket.setPurchaserId(purchaser.getId());
        } else {
            ticket.setPurchaserId(null);
        }

        TicketEntity savedTicket = ticketRepository.save(ticket);
        log.info("Successfully marked ticket as sold: ticketId={}, purchaserId={}", ticketId, purchaserId);
        return savedTicket;
    }

    @Override
    public TicketEntity issueTicketQr(UUID ticketId) throws IOException {
        TicketEntity ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", ticketId.toString()));
        if (ticket.getTicketStatus() != TicketStatus.SOLD) {
            throw new IllegalStateException("Only sold tickets can be issued");
        }
        if (ticket.getQrCode() != null && !ticket.getQrCode().isBlank()) return ticket;
        ticket.setQrCode(qrCodeService.generateAndUploadQRCode(ticketId));
        return ticketRepository.save(ticket);
    }

    /**
     * Marks a ticket as reserved (e.g., when added to cart).
     */
    @Override
    public void markTicketAsReserved(UUID ticketId) {
        markTicketAsReserved(ticketId, LocalDateTime.now(clock)
                .plusMinutes(reservationExpiryMinutes));
    }

    @Override
    public void markTicketAsReserved(UUID ticketId, LocalDateTime reservedUntil) {
        log.debug("Marking ticket as reserved: ticketId={}", ticketId);

        if (reservedUntil == null || !reservedUntil.isAfter(LocalDateTime.now(clock))) {
            throw new ValidationException("Reservation deadline must be in the future");
        }

        // Fetch ticket
        TicketEntity ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", ticketId.toString()));

        // Validate ticket is available
        if (ticket.getTicketStatus() != TicketStatus.AVAILABLE) {
            throw new IllegalStateException(
                    String.format("Ticket is not available. Current status: %s", ticket.getTicketStatus()));
        }

        // Update ticket status and set reservation expiry (e.g. 15 min)
        ticket.setTicketStatus(TicketStatus.RESERVED);
        ticket.setReservedUntil(reservedUntil);
        ticketRepository.save(ticket);

        log.info("Successfully marked ticket as reserved: ticketId={}, expires at {}", ticketId, ticket.getReservedUntil());
    }

    /**
     * Marks a ticket as available (e.g., when order is cancelled).
     */
    @Override
    public void markTicketAsAvailable(UUID ticketId) {
        log.debug("Marking ticket as available: ticketId={}", ticketId);

        // Fetch ticket
        TicketEntity ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", ticketId.toString()));

        // Validate ticket is not sold
        if (ticket.getTicketStatus() == TicketStatus.SOLD) {
            throw new IllegalStateException("Cannot mark sold ticket as available");
        }

        // Update ticket status
        ticket.setTicketStatus(TicketStatus.AVAILABLE);
        ticket.setPurchaserId(null);
        ticket.setReservedUntil(null);
        ticketRepository.save(ticket);

        log.info("Successfully marked ticket as available: ticketId={}", ticketId);
    }

    /**
     * Checks in a ticket.
     */
    @Override
    public void checkInTicket(UUID ticketId) {
        log.debug("Checking in ticket: ticketId={}", ticketId);

        // Fetch ticket
        TicketEntity ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", ticketId.toString()));

        // Validate ticket is sold
        if (ticket.getTicketStatus() != TicketStatus.SOLD) {
            throw new IllegalStateException("Only sold tickets can be checked in. Current status: " + ticket.getTicketStatus());
        }

        if (Boolean.TRUE.equals(ticket.getCheckedIn())) {
            throw new IllegalStateException("Ticket already checked in");
        }

        ticket.setCheckedIn(true);
        ticket.setCheckedInAt(java.time.LocalDateTime.now(clock));
        ticketRepository.save(ticket);
        log.info("Ticket checked in: ticketId={}, purchaserId={}", ticketId, ticket.getPurchaserId());
    }

    @Override
    @Transactional
    public Optional<UUID> reserveOneTicketAtomic(UUID eventId, TicketType ticketType) {
        LocalDateTime reservedUntil = LocalDateTime.now(clock).plusMinutes(reservationExpiryMinutes);
        return ticketRepository.reserveOneTicketAtomic(eventId, ticketType, reservedUntil);
    }

    @Override
    @Transactional
    public List<UUID> findAndReserveAvailableTickets(UUID eventId, TicketType ticketType, int count) {
        return findAndReserveAvailableTickets(eventId, ticketType, count,
                LocalDateTime.now(clock).plusMinutes(reservationExpiryMinutes));
    }

    @Override
    @Transactional
    public List<UUID> findAndReserveAvailableTickets(UUID eventId, TicketType ticketType, int count,
                                                     LocalDateTime reservedUntil) {
        if (count <= 0) {
            return List.of();
        }
        // Use atomic reserve-one in a loop so under high contention one request wins, rest fail fast
        List<UUID> reserved = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            Optional<UUID> id = ticketRepository.reserveOneTicketAtomic(eventId, ticketType, reservedUntil);
            if (id.isEmpty()) break;
            reserved.add(id.get());
        }
        return reserved;
    }

    @Override
    @Transactional
    public List<UUID> releaseExpiredReservations() {
        java.time.LocalDateTime now = java.time.LocalDateTime.now(clock);
        List<TicketEntity> expired = ticketRepository.findReservedWithExpiredHold(now);
        List<UUID> releasedIds = releaseExpiredTickets(expired);
        if (!expired.isEmpty()) {
            log.info("Released {} expired reservation(s)", expired.size());
        }
        return releasedIds;
    }

    @Override
    @Transactional
    public List<UUID> releaseExpiredReservationsForEvent(UUID eventId) {
        if (eventId == null) {
            return List.of();
        }
        java.time.LocalDateTime now = java.time.LocalDateTime.now(clock);
        List<TicketEntity> expired = ticketRepository.findReservedWithExpiredHoldForEvent(eventId, now);
        List<UUID> releasedIds = releaseExpiredTickets(expired);
        if (!expired.isEmpty()) {
            log.info("Released {} expired reservation(s) for event {}", expired.size(), eventId);
        }
        return releasedIds;
    }

    private List<UUID> releaseExpiredTickets(List<TicketEntity> expired) {
        List<UUID> releasedIds = new ArrayList<>();
        for (TicketEntity t : expired) {
            if (t.getTicketStatus() != TicketStatus.RESERVED) {
                log.warn("Skipping non-reserved ticket returned for expiry release: ticketId={}, status={}",
                        t.getId(), t.getTicketStatus());
                continue;
            }
            releasedIds.add(t.getId());
            t.setTicketStatus(TicketStatus.AVAILABLE);
            t.setReservedUntil(null);
            ticketRepository.save(t);
        }
        return releasedIds;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TicketEntity> getSeatsForEvent(UUID eventId) {
        return ticketRepository.findByEventIdWithSeats(eventId);
    }

    @Override
    @Transactional
    public int createSeatMap(UUID eventId, UUID creatorId, List<TicketService.SeatSectionSpec> sections) {
        EventEntity event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));
        UserEntity creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", creatorId.toString()));
        if (!Boolean.TRUE.equals(event.getReservedSeatingEnabled())) {
            throw new ValidationException("Event must have reserved seating enabled before creating a seat map");
        }
        List<TicketEntity> existingSeats = ticketRepository.findByEventIdWithSeats(eventId);
        if (!existingSeats.isEmpty()) {
            throw new ValidationException("A seat map already exists for this event. Remove existing seat inventory before recreating.");
        }
        List<TicketEntity> tickets = new ArrayList<>();
        for (TicketService.SeatSectionSpec spec : sections) {
            if (spec.rowCount() <= 0 || spec.seatsPerRow() <= 0 || spec.price() == null || spec.price().compareTo(BigDecimal.ZERO) < 0) {
                throw new ValidationException("Section must have rowCount, seatsPerRow and price > 0");
            }
            for (int r = 0; r < spec.rowCount(); r++) {
                String rowLabel = rowIndexToLabel(r);
                for (int num = 1; num <= spec.seatsPerRow(); num++) {
                    TicketEntity t = new TicketEntity();
                    t.setName(String.format("%s - %s %s-%d", event.getName(), spec.name(), rowLabel, num));
                    t.setPrice(spec.price());
                    t.setTicketType(TicketType.REGULAR);
                    t.setTicketStatus(TicketStatus.AVAILABLE);
                    t.setEventId(eventId);
                    t.setCreatorId(creatorId);
                    t.setSeatSection(spec.name());
                    t.setSeatRow(rowLabel);
                    t.setSeatNumber(num);
                    tickets.add(t);
                }
            }
        }
        ticketRepository.saveAll(tickets);
        log.info("Created seat map for event {}: {} seats", eventId, tickets.size());
        return tickets.size();
    }

    private static String rowIndexToLabel(int index) {
        if (index < 26) return String.valueOf((char) ('A' + index));
        return String.valueOf((char) ('A' + (index / 26) - 1)) + (char) ('A' + (index % 26));
    }
}
