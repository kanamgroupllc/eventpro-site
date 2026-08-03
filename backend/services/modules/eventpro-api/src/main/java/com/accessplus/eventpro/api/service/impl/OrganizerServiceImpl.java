package com.accessplus.eventpro.api.service.impl;

import com.accessplus.eventpro.api.dto.AttendeeResponse;
import com.accessplus.eventpro.api.dto.CheckInResponse;
import com.accessplus.eventpro.api.dto.CulturalInterestResponse;
import com.accessplus.eventpro.api.dto.EventPulseResponse;
import com.accessplus.eventpro.api.dto.EventStatsResponse;
import com.accessplus.eventpro.api.dto.OrganizerInsightsResponse;
import com.accessplus.eventpro.api.dto.OrganizerSummaryResponse;
import com.accessplus.eventpro.api.dto.PayoutEligibilityDto;
import com.accessplus.eventpro.api.dto.RecentSaleResponse;
import com.accessplus.eventpro.api.config.PlatformTierFeeProperties;
import com.accessplus.eventpro.api.service.OrganizerService;
import com.accessplus.eventpro.core.notification.service.NotificationService;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.order.order.repository.OrderItemRepository;
import com.accessplus.eventpro.order.order.repository.OrderRepository;
import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.shared.entity.OrderItemEntity;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.OrderStatus;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import com.accessplus.eventpro.event.ticket.repository.TicketRepository;
import com.accessplus.eventpro.api.subscription.repository.SubscriptionPaymentRepository;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrganizerServiceImpl implements OrganizerService {
    
    private final EventRepository eventRepository;
    private final TicketRepository ticketRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final SubscriptionPaymentRepository subscriptionPaymentRepository;
    private final PlatformTierFeeProperties tierFeeProperties;

    @Value("${eventpro.payout.pending-hold-days:3}")
    private int pendingHoldDays;

    @Override
    public OrganizerSummaryResponse getOrganizerSummary(UUID organizerId) {
        log.debug("Getting organizer summary: organizerId={}", organizerId);
        List<EventEntity> events = eventRepository.findByOrganizerId(organizerId, PageRequest.of(0, Integer.MAX_VALUE)).getContent();
        Set<UUID> eventIds = events.stream().map(EventEntity::getId).collect(Collectors.toSet());
        long eventsHosted = events.size();
        long ticketsSold = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;
        for (EventEntity event : events) {
            UUID eventId = event.getId();
            ticketsSold += ticketRepository.countByEventIdAndStatus(eventId, TicketStatus.SOLD);
            BigDecimal eventRevenue = orderRepository.findByStatus(OrderStatus.PAID, PageRequest.of(0, Integer.MAX_VALUE))
                    .getContent().stream()
                    .flatMap(order -> orderItemRepository.findByOrderId(order.getId()).stream())
                    .filter(oi -> {
                        try {
                            var ticket = ticketRepository.findById(oi.getTicketId()).orElse(null);
                            return ticket != null && ticket.getEventId().equals(eventId);
                        } catch (Exception e) {
                            return false;
                        }
                    })
                    .map(oi -> oi.getPrice().multiply(BigDecimal.valueOf(oi.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            totalRevenue = totalRevenue.add(eventRevenue);
        }
        UserEntity user = userRepository.findById(organizerId).orElse(null);
        String tier = user != null && user.getSubscriptionTier() != null ? user.getSubscriptionTier().toUpperCase() : "BASIC";
        BigDecimal totalFeesLifeToDate = getOrganizerFeesLifeToDate(organizerId, eventIds, totalRevenue);
        String feeRateLabel = formatFeeRateLabel(tier);
        String riskLevel = user != null && user.getRiskLevel() != null ? user.getRiskLevel() : "LOW";
        boolean w9Submitted = user != null && Boolean.TRUE.equals(user.getW9Submitted());
        PayoutEligibilityDto payoutEligibility = computePayoutEligibility(tier, riskLevel);
        // Pending = net (revenue − fees) from orders in the last N days; available = rest.
        BigDecimal totalNet = totalRevenue.subtract(totalFeesLifeToDate).max(BigDecimal.ZERO);
        BigDecimal pendingNet = getOrganizerPendingNet(organizerId, eventIds, tier);
        BigDecimal pendingBalance = pendingNet.min(totalNet);
        BigDecimal availableBalance = totalNet.subtract(pendingBalance).max(BigDecimal.ZERO);
        return OrganizerSummaryResponse.builder()
                .eventsHosted(eventsHosted)
                .ticketsSold(ticketsSold)
                .ticketsSoldTrendPercent(null)
                .totalRevenue(totalRevenue)
                .platformFeesWithheld(totalFeesLifeToDate)
                .platformFeeRateLabel(feeRateLabel)
                .availableBalance(availableBalance)
                .pendingBalance(pendingBalance)
                .pendingHoldDays(pendingHoldDays > 0 ? pendingHoldDays : null)
                .riskFlagged(false)
                .riskLevel(riskLevel)
                .w9Submitted(w9Submitted)
                .payoutEligibility(payoutEligibility)
                .build();
    }

    /**
     * Organizer's net (revenue − fees) from PAID orders in the last pendingHoldDays.
     * Used to split total net into "pending" (in hold) vs "available" for payout.
     */
    private BigDecimal getOrganizerPendingNet(UUID organizerId, Set<UUID> eventIds, String tier) {
        if (eventIds.isEmpty() || pendingHoldDays <= 0) return BigDecimal.ZERO;
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = now.minusDays(pendingHoldDays);
        // End 1s in future so orders created in the same second are included (BETWEEN inclusive)
        LocalDateTime end = now.plusSeconds(1);
        // Use createdAt (set by Hibernate on insert) so we catch all PAID orders in the window
        // even if order_date were missing or out of sync in any code path
        Page<OrderEntity> ordersPage = orderRepository.findByStatusAndCreatedAtBetween(
                OrderStatus.PAID, cutoff, end, PageRequest.of(0, Integer.MAX_VALUE));
        int totalOrdersInRange = ordersPage.getNumberOfElements();
        if (totalOrdersInRange > 0) {
            log.debug("getOrganizerPendingNet: organizerId={}, cutoff={}, end={}, paidOrdersInRange={}",
                    organizerId, cutoff, end, totalOrdersInRange);
        }
        double feePercent = tierFeeProperties.getFeePercentForTier(tier);
        BigDecimal feePerTicket = tierFeeProperties.getFeePerTicketForTier(tier);
        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal fees = BigDecimal.ZERO;
        for (OrderEntity order : ordersPage.getContent()) {
            BigDecimal organizerRevenueFromOrder = BigDecimal.ZERO;
            int organizerTicketCount = 0;
            for (OrderItemEntity oi : orderItemRepository.findByOrderId(order.getId())) {
                TicketEntity ticket = ticketRepository.findById(oi.getTicketId()).orElse(null);
                if (ticket != null && eventIds.contains(ticket.getEventId())) {
                    BigDecimal lineTotal = oi.getPrice().multiply(BigDecimal.valueOf(oi.getQuantity()));
                    organizerRevenueFromOrder = organizerRevenueFromOrder.add(lineTotal);
                    organizerTicketCount += oi.getQuantity();
                }
            }
            if (organizerRevenueFromOrder.compareTo(BigDecimal.ZERO) <= 0) continue;
            revenue = revenue.add(organizerRevenueFromOrder);
            BigDecimal percentFee = organizerRevenueFromOrder.multiply(BigDecimal.valueOf(feePercent)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal flatFee = feePerTicket.multiply(BigDecimal.valueOf(organizerTicketCount)).setScale(2, RoundingMode.HALF_UP);
            fees = fees.add(percentFee).add(flatFee);
        }
        return revenue.subtract(fees).max(BigDecimal.ZERO);
    }

    /**
     * Life-to-date platform fees (withheld from ticket sales) for this organizer.
     * Uses tier-based rates from Pricing page: Basic 3.5%+$0.99, Pro 2.9%+$0.79, Enterprise 2.5%+$0.49 per ticket.
     */
    private BigDecimal getOrganizerFeesLifeToDate(UUID organizerId, Set<UUID> eventIds, BigDecimal totalRevenue) {
        if (eventIds.isEmpty()) return BigDecimal.ZERO;
        String tier = userRepository.findById(organizerId).map(UserEntity::getSubscriptionTier).orElse("BASIC");
        double feePercent = tierFeeProperties.getFeePercentForTier(tier);
        BigDecimal feePerTicket = tierFeeProperties.getFeePerTicketForTier(tier);
        Page<OrderEntity> ordersPage = orderRepository.findByStatus(OrderStatus.PAID, PageRequest.of(0, Integer.MAX_VALUE));
        BigDecimal totalFees = BigDecimal.ZERO;
        for (OrderEntity order : ordersPage.getContent()) {
            BigDecimal organizerRevenueFromOrder = BigDecimal.ZERO;
            int organizerTicketCount = 0;
            for (OrderItemEntity oi : orderItemRepository.findByOrderId(order.getId())) {
                TicketEntity ticket = ticketRepository.findById(oi.getTicketId()).orElse(null);
                if (ticket != null && eventIds.contains(ticket.getEventId())) {
                    BigDecimal lineTotal = oi.getPrice().multiply(BigDecimal.valueOf(oi.getQuantity()));
                    organizerRevenueFromOrder = organizerRevenueFromOrder.add(lineTotal);
                    organizerTicketCount += oi.getQuantity();
                }
            }
            if (organizerRevenueFromOrder.compareTo(BigDecimal.ZERO) <= 0) continue;
            BigDecimal percentFee = organizerRevenueFromOrder.multiply(BigDecimal.valueOf(feePercent)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal flatFee = feePerTicket.multiply(BigDecimal.valueOf(organizerTicketCount)).setScale(2, RoundingMode.HALF_UP);
            totalFees = totalFees.add(percentFee).add(flatFee);
        }
        return totalFees;
    }

    /** e.g. "2.9% + $0.79 per ticket (Pro)" for dashboard display. */
    private String formatFeeRateLabel(String tier) {
        if (tier == null) tier = "BASIC";
        double pct = tierFeeProperties.getFeePercentForTier(tier);
        BigDecimal perTicket = tierFeeProperties.getFeePerTicketForTier(tier);
        String tierName = switch (tier.toUpperCase()) {
            case "PRO" -> "Pro";
            case "ENTERPRISE" -> "Enterprise";
            default -> "Basic";
        };
        return String.format("%s%% + $%s per ticket (%s)", pct, perTicket.setScale(2, RoundingMode.HALF_UP), tierName);
    }

    /**
     * Tiered payout eligibility: Basic = T+2 only; Pro = 50% early if LOW/MEDIUM risk;
     * Enterprise = 100% instant if LOW risk, else 50% early if MEDIUM.
     */
    private PayoutEligibilityDto computePayoutEligibility(String tier, String riskLevel) {
        boolean standardT2 = true;
        boolean early50 = false;
        boolean instant100 = false;
        String label = "Standard (T+2)";
        if ("ENTERPRISE".equals(tier) && "LOW".equalsIgnoreCase(riskLevel)) {
            early50 = true;
            instant100 = true;
            label = "Instant payout available";
        } else if ("ENTERPRISE".equals(tier) && "MEDIUM".equalsIgnoreCase(riskLevel)) {
            early50 = true;
            label = "50% early available";
        } else if ("PRO".equals(tier) && ("LOW".equalsIgnoreCase(riskLevel) || "MEDIUM".equalsIgnoreCase(riskLevel))) {
            early50 = true;
            label = "50% early available";
        }
        return PayoutEligibilityDto.builder()
                .standardT2(standardT2)
                .early50Percent(early50)
                .instant100(instant100)
                .label(label)
                .build();
    }

    @Override
    public BigDecimal getOrganizerRevenueForYear(UUID organizerId, int year) {
        LocalDateTime start = LocalDateTime.of(year, 1, 1, 0, 0, 0);
        LocalDateTime end = LocalDateTime.of(year, 12, 31, 23, 59, 59);
        List<EventEntity> events = eventRepository.findByOrganizerId(organizerId, PageRequest.of(0, Integer.MAX_VALUE)).getContent();
        Set<UUID> eventIds = events.stream().map(EventEntity::getId).collect(Collectors.toSet());
        if (eventIds.isEmpty()) return BigDecimal.ZERO;
        Page<OrderEntity> ordersPage = orderRepository.findByStatusAndOrderDateBetween(
                OrderStatus.PAID, start, end, PageRequest.of(0, Integer.MAX_VALUE));
        BigDecimal total = BigDecimal.ZERO;
        for (OrderEntity order : ordersPage.getContent()) {
            for (OrderItemEntity oi : orderItemRepository.findByOrderId(order.getId())) {
                TicketEntity ticket = ticketRepository.findById(oi.getTicketId()).orElse(null);
                if (ticket != null && eventIds.contains(ticket.getEventId())) {
                    total = total.add(oi.getPrice().multiply(BigDecimal.valueOf(oi.getQuantity())));
                }
            }
        }
        return total;
    }

    @Override
    public BigDecimal getOrganizerFeesForYear(UUID organizerId, int year) {
        LocalDateTime start = LocalDateTime.of(year, 1, 1, 0, 0, 0);
        LocalDateTime end = LocalDateTime.of(year, 12, 31, 23, 59, 59);
        List<EventEntity> events = eventRepository.findByOrganizerId(organizerId, PageRequest.of(0, Integer.MAX_VALUE)).getContent();
        Set<UUID> eventIds = events.stream().map(EventEntity::getId).collect(Collectors.toSet());
        if (eventIds.isEmpty()) return BigDecimal.ZERO;
        String tier = userRepository.findById(organizerId).map(UserEntity::getSubscriptionTier).orElse("BASIC");
        double feePercent = tierFeeProperties.getFeePercentForTier(tier);
        BigDecimal feePerTicket = tierFeeProperties.getFeePerTicketForTier(tier);
        Page<OrderEntity> ordersPage = orderRepository.findByStatusAndOrderDateBetween(
                OrderStatus.PAID, start, end, PageRequest.of(0, Integer.MAX_VALUE));
        BigDecimal totalFees = BigDecimal.ZERO;
        for (OrderEntity order : ordersPage.getContent()) {
            BigDecimal organizerRevenueFromOrder = BigDecimal.ZERO;
            int organizerTicketCount = 0;
            for (OrderItemEntity oi : orderItemRepository.findByOrderId(order.getId())) {
                TicketEntity ticket = ticketRepository.findById(oi.getTicketId()).orElse(null);
                if (ticket != null && eventIds.contains(ticket.getEventId())) {
                    organizerRevenueFromOrder = organizerRevenueFromOrder.add(
                            oi.getPrice().multiply(BigDecimal.valueOf(oi.getQuantity())));
                    organizerTicketCount += oi.getQuantity();
                }
            }
            if (organizerRevenueFromOrder.compareTo(BigDecimal.ZERO) <= 0) continue;
            BigDecimal percentFee = organizerRevenueFromOrder.multiply(BigDecimal.valueOf(feePercent)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal flatFee = feePerTicket.multiply(BigDecimal.valueOf(organizerTicketCount)).setScale(2, RoundingMode.HALF_UP);
            totalFees = totalFees.add(percentFee).add(flatFee);
        }
        return totalFees;
    }

    @Override
    public BigDecimal getOrganizerSubscriptionPaymentsForYear(UUID organizerId, int year) {
        Instant start = LocalDateTime.of(year, 1, 1, 0, 0, 0).toInstant(ZoneOffset.UTC);
        Instant end = LocalDateTime.of(year + 1, 1, 1, 0, 0, 0).toInstant(ZoneOffset.UTC);
        BigDecimal sum = subscriptionPaymentRepository.sumAmountByUserIdAndPaidAtBetween(organizerId, start, end);
        return sum != null ? sum : BigDecimal.ZERO;
    }

    @Override
    public EventStatsResponse getEventStats(UUID eventId, UUID organizerId) {
        log.debug("Getting event stats: eventId={}, organizerId={}", eventId, organizerId);
        
        // Verify event exists and belongs to organizer
        EventEntity event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));
        
        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new ResourceNotFoundException("Event", eventId.toString());
        }
        
        // Get all tickets for the event
        Pageable pageable = PageRequest.of(0, Integer.MAX_VALUE);
        List<TicketEntity> tickets = ticketRepository.findByEventId(eventId, pageable).getContent();
        
        // Calculate statistics
        long totalTickets = tickets.size();
        long ticketsSold = tickets.stream()
                .filter(t -> t.getTicketStatus() == TicketStatus.SOLD)
                .count();
        long ticketsAvailable = tickets.stream()
                .filter(t -> t.getTicketStatus() == TicketStatus.AVAILABLE)
                .count();
        
        // Calculate revenue from paid orders
        BigDecimal revenue = orderRepository.findByStatus(OrderStatus.PAID, PageRequest.of(0, Integer.MAX_VALUE))
                .getContent().stream()
                .flatMap(order -> orderItemRepository.findByOrderId(order.getId()).stream())
                .filter(oi -> {
                    try {
                        var ticket = ticketRepository.findById(oi.getTicketId()).orElse(null);
                        return ticket != null && ticket.getEventId().equals(eventId);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .map(oi -> oi.getPrice().multiply(BigDecimal.valueOf(oi.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Count attendees (unique users who purchased tickets)
        long attendees = tickets.stream()
                .filter(t -> t.getTicketStatus() == TicketStatus.SOLD && t.getPurchaserId() != null)
                .map(TicketEntity::getPurchaserId)
                .distinct()
                .count();
        
        // Count checked in
        long checkedIn = tickets.stream()
                .filter(t -> Boolean.TRUE.equals(t.getCheckedIn()))
                .count();
        
        return EventStatsResponse.builder()
                .ticketsSold(ticketsSold)
                .ticketsAvailable(ticketsAvailable)
                .totalTickets(totalTickets)
                .revenue(revenue)
                .attendees(attendees)
                .checkedIn(checkedIn)
                .build();
    }
    
    @Override
    public List<AttendeeResponse> getEventAttendees(UUID eventId, UUID organizerId) {
        log.debug("Getting event attendees: eventId={}, organizerId={}", eventId, organizerId);
        
        // Verify event exists and belongs to organizer
        EventEntity event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));
        
        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new ResourceNotFoundException("Event", eventId.toString());
        }
        
        // Get all sold tickets for the event
        Pageable pageable = PageRequest.of(0, Integer.MAX_VALUE);
        List<TicketEntity> soldTickets = ticketRepository.findByEventId(eventId, pageable).getContent().stream()
                .filter(t -> t.getTicketStatus() == TicketStatus.SOLD && t.getPurchaserId() != null)
                .collect(Collectors.toList());
        
        // Build attendee list
        List<AttendeeResponse> attendees = new ArrayList<>();
        for (TicketEntity ticket : soldTickets) {
            UserEntity user = userRepository.findById(ticket.getPurchaserId())
                    .orElse(null);
            
            // Find order for this ticket
            OrderEntity order = orderRepository.findByStatus(OrderStatus.PAID, PageRequest.of(0, Integer.MAX_VALUE))
                    .getContent().stream()
                    .filter(o -> orderItemRepository.findByOrderId(o.getId()).stream()
                            .anyMatch(oi -> oi.getTicketId().equals(ticket.getId())))
                    .findFirst()
                    .orElse(null);
            
            String first = user != null ? user.getFirstName() : (order != null ? order.getGuestFirstName() : null);
            String last = user != null ? user.getLastName() : (order != null ? order.getGuestLastName() : null);
            String email = user != null ? user.getEmail() : (order != null ? order.getGuestEmail() : null);
            AttendeeResponse attendee = AttendeeResponse.builder()
                    .ticketId(ticket.getId())
                    .userId(ticket.getPurchaserId())
                    .firstName(first)
                    .lastName(last)
                    .email(email)
                    .ticketType(ticket.getTicketType().name())
                    .ticketPrice(ticket.getPrice())
                    .purchaseDate(order != null ? order.getOrderDate() : null)
                    .checkedIn(Boolean.TRUE.equals(ticket.getCheckedIn()))
                    .checkedInAt(ticket.getCheckedInAt())
                    .build();
            
            attendees.add(attendee);
        }
        
        return attendees;
    }

    @Override
    public CheckInResponse getCheckInResult(UUID ticketId, UUID organizerId) {
        TicketEntity ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", ticketId.toString()));
        EventEntity event = eventRepository.findByIdWithOrganizer(ticket.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event", ticket.getEventId().toString()));
        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new ResourceNotFoundException("Ticket", ticketId.toString());
        }
        String ticketName = ticket.getName() != null ? ticket.getName() : ticket.getTicketType().name();
        String attendeeName = "Guest";
        if (ticket.getPurchaserId() != null) {
            UserEntity user = userRepository.findById(ticket.getPurchaserId()).orElse(null);
            if (user != null) {
                String first = user.getFirstName() != null ? user.getFirstName().trim() : "";
                String last = user.getLastName() != null ? user.getLastName().trim() : "";
                attendeeName = (first + " " + last).trim();
                if (attendeeName.isEmpty()) attendeeName = user.getEmail();
            }
        } else {
            List<OrderItemEntity> items = orderItemRepository.findByTicketId(ticketId);
            if (!items.isEmpty()) {
                OrderEntity order = orderRepository.findById(items.get(0).getOrderId()).orElse(null);
                if (order != null) {
                    String first = order.getGuestFirstName() != null ? order.getGuestFirstName().trim() : "";
                    String last = order.getGuestLastName() != null ? order.getGuestLastName().trim() : "";
                    attendeeName = (first + " " + last).trim();
                    if (attendeeName.isEmpty()) attendeeName = order.getGuestEmail() != null ? order.getGuestEmail() : "Guest";
                }
            }
        }
        return CheckInResponse.builder()
                .ticketName(ticketName)
                .attendeeName(attendeeName != null && !attendeeName.isEmpty() ? attendeeName : "Guest")
                .alreadyCheckedIn(Boolean.TRUE.equals(ticket.getCheckedIn()))
                .build();
    }

    @Override
    public int emailEventAttendees(UUID eventId, UUID organizerId, String subject, String body) {
        List<AttendeeResponse> attendees = getEventAttendees(eventId, organizerId);
        Set<String> emails = attendees.stream()
                .map(AttendeeResponse::getEmail)
                .filter(e -> e != null && !e.trim().isEmpty())
                .map(String::trim)
                .collect(Collectors.toSet());
        if (emails.isEmpty()) {
            log.info("No attendee emails to send to for event: {}", eventId);
            return 0;
        }
        String bodyHtml = body == null ? "" : "<html><body><p>" + body.replace("\n", "<br>") + "</p></body></html>";
        String bodyText = body != null ? body : "";
        String subj = subject != null && !subject.trim().isEmpty() ? subject.trim() : "Update from your event organizer";
        int sent = 0;
        for (String email : emails) {
            notificationService.sendOrganizerBroadcastEmail(email, subj, bodyText, bodyHtml);
            sent++;
        }
        log.info("Organizer broadcast sent to {} recipients for event: {}", sent, eventId);
        return sent;
    }

    @Override
    public byte[] exportData(UUID organizerId, String type, String format) {
        List<EventEntity> events = eventRepository.findByOrganizerId(organizerId, PageRequest.of(0, Integer.MAX_VALUE)).getContent();
        if (!"csv".equalsIgnoreCase(format)) {
            format = "csv";
        }
        StringBuilder csv = new StringBuilder();
        switch (type != null ? type.toLowerCase() : "attendees") {
            case "attendees" -> {
                csv.append("Event Name,First Name,Last Name,Email,Ticket Type,Purchase Date\n");
                for (EventEntity event : events) {
                    List<AttendeeResponse> list = getEventAttendees(event.getId(), organizerId);
                    for (AttendeeResponse a : list) {
                        csv.append(escapeCsv(event.getName())).append(",")
                                .append(escapeCsv(a.getFirstName())).append(",")
                                .append(escapeCsv(a.getLastName())).append(",")
                                .append(escapeCsv(a.getEmail())).append(",")
                                .append(escapeCsv(a.getTicketType())).append(",")
                                .append(a.getPurchaseDate() != null ? a.getPurchaseDate().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "").append("\n");
                    }
                }
            }
            case "checkin" -> {
                csv.append("Event Name,First Name,Last Name,Email,Ticket Type,Checked In,Check-in Time\n");
                for (EventEntity event : events) {
                    List<AttendeeResponse> list = getEventAttendees(event.getId(), organizerId);
                    for (AttendeeResponse a : list) {
                        csv.append(escapeCsv(event.getName())).append(",")
                                .append(escapeCsv(a.getFirstName())).append(",")
                                .append(escapeCsv(a.getLastName())).append(",")
                                .append(escapeCsv(a.getEmail())).append(",")
                                .append(escapeCsv(a.getTicketType())).append(",")
                                .append(Boolean.TRUE.equals(a.getCheckedIn()) ? "Yes" : "No").append(",")
                                .append(a.getCheckedInAt() != null ? a.getCheckedInAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "").append("\n");
                    }
                }
            }
            case "marketing" -> {
                csv.append("Email,First Name,Last Name\n");
                Set<String> seen = new java.util.HashSet<>();
                for (EventEntity event : events) {
                    List<AttendeeResponse> list = getEventAttendees(event.getId(), organizerId);
                    for (AttendeeResponse a : list) {
                        String email = a.getEmail() != null ? a.getEmail().trim() : "";
                        if (!email.isEmpty() && seen.add(email)) {
                            csv.append(escapeCsv(email)).append(",")
                                    .append(escapeCsv(a.getFirstName())).append(",")
                                    .append(escapeCsv(a.getLastName())).append("\n");
                        }
                    }
                }
            }
            case "financial" -> {
                csv.append("Event Name,Tickets Sold,Revenue\n");
                BigDecimal totalRevenue = BigDecimal.ZERO;
                long totalSold = 0;
                for (EventEntity event : events) {
                    EventStatsResponse stats = getEventStats(event.getId(), organizerId);
                    long sold = stats.getTicketsSold() != null ? stats.getTicketsSold() : 0;
                    BigDecimal rev = stats.getRevenue() != null ? stats.getRevenue() : BigDecimal.ZERO;
                    totalSold += sold;
                    totalRevenue = totalRevenue.add(rev);
                    csv.append(escapeCsv(event.getName())).append(",").append(sold).append(",").append(rev).append("\n");
                }
                csv.append("TOTAL,").append(totalSold).append(",").append(totalRevenue).append("\n");
            }
            default -> {
                csv.append("Event Name,First Name,Last Name,Email,Ticket Type,Purchase Date\n");
                for (EventEntity event : events) {
                    List<AttendeeResponse> list = getEventAttendees(event.getId(), organizerId);
                    for (AttendeeResponse a : list) {
                        csv.append(escapeCsv(event.getName())).append(",")
                                .append(escapeCsv(a.getFirstName())).append(",")
                                .append(escapeCsv(a.getLastName())).append(",")
                                .append(escapeCsv(a.getEmail())).append(",")
                                .append(escapeCsv(a.getTicketType())).append(",")
                                .append(a.getPurchaseDate() != null ? a.getPurchaseDate().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "").append("\n");
                    }
                }
            }
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    @Override
    public List<RecentSaleResponse> getRecentSales(UUID organizerId, int limit) {
        List<EventEntity> events = eventRepository.findByOrganizerId(organizerId, PageRequest.of(0, Integer.MAX_VALUE)).getContent();
        List<UUID> eventIds = events.stream().map(EventEntity::getId).toList();
        if (eventIds.isEmpty()) return List.of();

        List<UUID> ticketIds = new ArrayList<>();
        Pageable pageable = PageRequest.of(0, Integer.MAX_VALUE);
        for (UUID eventId : eventIds) {
            ticketIds.addAll(ticketRepository.findByEventId(eventId, pageable).getContent().stream()
                    .filter(t -> t.getTicketStatus() == TicketStatus.SOLD)
                    .map(TicketEntity::getId)
                    .toList());
        }
        if (ticketIds.isEmpty()) return List.of();

        List<OrderItemEntity> orderItems = orderItemRepository.findByTicketIdIn(ticketIds);
        Set<UUID> orderIds = orderItems.stream().map(OrderItemEntity::getOrderId).collect(Collectors.toSet());
        List<OrderEntity> orders = orderRepository.findAllById(orderIds).stream()
                .filter(o -> o.getStatus() == OrderStatus.PAID)
                .sorted(Comparator.comparing(OrderEntity::getOrderDate).reversed())
                .limit(limit)
                .toList();

        Map<UUID, EventEntity> eventMap = events.stream().collect(Collectors.toMap(EventEntity::getId, e -> e));
        List<RecentSaleResponse> result = new ArrayList<>();
        for (OrderEntity order : orders) {
            List<OrderItemEntity> itemsForOrder = orderItems.stream().filter(oi -> oi.getOrderId().equals(order.getId())).toList();
            int qty = itemsForOrder.stream().mapToInt(OrderItemEntity::getQuantity).sum();
            OrderItemEntity first = itemsForOrder.get(0);
            TicketEntity ticket = ticketRepository.findById(first.getTicketId()).orElse(null);
            EventEntity event = ticket != null ? eventMap.get(ticket.getEventId()) : null;
            String ticketTypeName = ticket != null ? ticket.getTicketType().name() : "Ticket";
            String eventName = event != null ? event.getName() : "Event";
            String buyerName;
            if (order.getUserId() != null) {
                UserEntity u = userRepository.findById(order.getUserId()).orElse(null);
                buyerName = u != null ? (u.getFirstName() + " " + (u.getLastName() != null ? u.getLastName() : "")).trim() : "Guest";
            } else {
                buyerName = (order.getGuestFirstName() != null ? order.getGuestFirstName() : "") + " " + (order.getGuestLastName() != null ? order.getGuestLastName() : "").trim();
                if (buyerName.isBlank()) buyerName = "Guest";
            }
            result.add(RecentSaleResponse.builder()
                    .orderId(order.getId())
                    .buyerName(buyerName)
                    .quantity(qty)
                    .ticketTypeName(ticketTypeName)
                    .eventName(eventName)
                    .soldAt(order.getOrderDate())
                    .build());
        }
        return result;
    }

    @Override
    public OrganizerInsightsResponse getInsights(UUID organizerId) {
        List<EventEntity> events = eventRepository.findByOrganizerId(organizerId, PageRequest.of(0, Integer.MAX_VALUE)).getContent();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime weekAgo = now.minusDays(7);
        LocalDateTime twoWeeksAgo = now.minusDays(14);

        List<EventPulseResponse> pulses = new ArrayList<>();
        Map<String, Long> categoryCounts = new LinkedHashMap<>();
        String aiInsight = null;

        for (EventEntity event : events) {
            EventStatsResponse stats = getEventStats(event.getId(), organizerId);
            long sold = stats.getTicketsSold() != null ? stats.getTicketsSold() : 0;
            long lastWeek = countTicketsSoldInPeriod(organizerId, event.getId(), weekAgo, now);
            long prevWeek = countTicketsSoldInPeriod(organizerId, event.getId(), twoWeeksAgo, weekAgo);
            String velocity = "steady";
            Double percentChange = 0.0;
            String label = "Steady Growth";
            if (prevWeek > 0) {
                double pct = 100.0 * (lastWeek - prevWeek) / prevWeek;
                percentChange = Math.round(pct * 10) / 10.0;
                if (pct >= 20) {
                    velocity = "trending_up";
                    label = "Trending Up (+" + (int) Math.round(pct) + "% vs last week)";
                } else if (pct <= -10) {
                    velocity = "slowing";
                    label = "Slowing - Consider a Promo Code";
                } else {
                    label = "Steady Growth";
                }
            } else if (lastWeek > 0) {
                velocity = "trending_up";
                percentChange = 100.0;
                label = "Trending Up (new sales)";
            }
            pulses.add(EventPulseResponse.builder()
                    .eventId(event.getId())
                    .eventName(event.getName())
                    .velocity(velocity)
                    .percentChange(percentChange)
                    .label(label)
                    .build());

            if (event.getCategory() != null && event.getCategory().getName() != null && sold > 0) {
                categoryCounts.merge(event.getCategory().getName(), sold, Long::sum);
            }
        }

        List<CulturalInterestResponse> topCultural = categoryCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> CulturalInterestResponse.builder().name(e.getKey()).count(e.getValue()).build())
                .toList();

        if (events.size() == 1 && events.get(0) != null) {
            EventEntity e = events.get(0);
            long sold = getEventStats(e.getId(), organizerId).getTicketsSold() != null ? getEventStats(e.getId(), organizerId).getTicketsSold() : 0;
            if (sold > 0) {
                aiInsight = "Insight: " + sold + " ticket(s) sold for '" + e.getName() + "'. Share on social or offer an early-bird discount to boost sales.";
            }
        }
        if (aiInsight == null && events.size() > 1) {
            EventEntity top = null;
            long maxSold = 0;
            for (EventEntity ev : events) {
                EventStatsResponse st = getEventStats(ev.getId(), organizerId);
                long s = st.getTicketsSold() != null ? st.getTicketsSold() : 0;
                if (s >= maxSold) {
                    maxSold = s;
                    top = ev;
                }
            }
            if (top != null && maxSold > 0) {
                aiInsight = "Insight: Your '" + top.getName() + "' event is leading with " + maxSold + " tickets sold. 60% of attendees may be repeat customers—consider a loyalty discount for your next event.";
            }
        }
        if (aiInsight == null) aiInsight = "Insight: Create and publish events to see AI-powered tips here.";

        return OrganizerInsightsResponse.builder()
                .aiInsight(aiInsight)
                .eventPulses(pulses)
                .topCulturalInterests(topCultural)
                .build();
    }

    private long countTicketsSoldInPeriod(UUID organizerId, UUID eventId, LocalDateTime start, LocalDateTime end) {
        List<OrderEntity> paid = orderRepository.findByStatus(OrderStatus.PAID, PageRequest.of(0, Integer.MAX_VALUE)).getContent().stream()
                .filter(o -> !o.getOrderDate().isBefore(start) && o.getOrderDate().isBefore(end))
                .toList();
        long count = 0;
        for (OrderEntity order : paid) {
            for (OrderItemEntity oi : orderItemRepository.findByOrderId(order.getId())) {
                var ticket = ticketRepository.findById(oi.getTicketId()).orElse(null);
                if (ticket != null && ticket.getEventId().equals(eventId)) count += oi.getQuantity();
            }
        }
        return count;
    }
}

