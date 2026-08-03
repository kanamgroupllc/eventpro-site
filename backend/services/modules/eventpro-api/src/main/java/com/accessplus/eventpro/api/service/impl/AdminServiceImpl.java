package com.accessplus.eventpro.api.service.impl;

import com.accessplus.eventpro.api.dto.AdminStatsResponse;
import com.accessplus.eventpro.api.dto.EventSaleResponse;
import com.accessplus.eventpro.api.dto.RevenueDataResponse;
import com.accessplus.eventpro.api.service.AdminService;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.order.order.repository.OrderItemRepository;
import com.accessplus.eventpro.order.order.repository.OrderRepository;
import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.shared.entity.OrderItemEntity;
import com.accessplus.eventpro.shared.enums.OrderStatus;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import com.accessplus.eventpro.event.ticket.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementation of AdminService.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminServiceImpl implements AdminService {
    
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final TicketRepository ticketRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    
    @Override
    public AdminStatsResponse getPlatformStats() {
        log.debug("Getting platform statistics");
        
        // Get total counts
        long totalUsers = userRepository.count();
        long usersAttendeeCount = userRepository.countByRole("USER");
        long usersOrganizerCount = userRepository.countByRole("ORGANIZER");
        long usersAdminCount = userRepository.countByRole("ADMIN");
        long totalEvents = eventRepository.count();
        long totalTicketsSold = ticketRepository.countByTicketStatus(TicketStatus.SOLD);
        
        // Calculate total revenue from paid orders
        List<OrderEntity> paidOrders = orderRepository.findByStatus(OrderStatus.PAID, PageRequest.of(0, Integer.MAX_VALUE))
                .getContent();
        BigDecimal totalRevenue = paidOrders.stream()
                .map(OrderEntity::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Calculate growth (simplified - compare last 30 days vs previous 30 days)
        // For now, we'll set growth to 0.0 as we don't have historical tracking
        double userGrowth = 0.0;
        double eventGrowth = 0.0;
        double ticketGrowth = 0.0;
        double revenueGrowth = 0.0;
        
        return AdminStatsResponse.builder()
                .totalUsers(totalUsers)
                .totalEvents(totalEvents)
                .totalTicketsSold(totalTicketsSold)
                .totalRevenue(totalRevenue)
                .userGrowth(userGrowth)
                .eventGrowth(eventGrowth)
                .ticketGrowth(ticketGrowth)
                .revenueGrowth(revenueGrowth)
                .usersAttendeeCount(usersAttendeeCount)
                .usersOrganizerCount(usersOrganizerCount)
                .usersAdminCount(usersAdminCount)
                .build();
    }
    
    @Override
    public List<EventSaleResponse> getEventSales() {
        log.debug("Getting event sales data");
        
        // Get all events
        Pageable pageable = PageRequest.of(0, Integer.MAX_VALUE);
        List<EventEntity> events = eventRepository.findAll(pageable).getContent();
        
        List<EventSaleResponse> eventSales = new ArrayList<>();
        
        for (var event : events) {
            // Count tickets sold for this event (through order items)
            long ticketsSold = orderItemRepository.findAll().stream()
                    .filter(oi -> {
                        try {
                            var ticket = ticketRepository.findById(oi.getTicketId()).orElse(null);
                            return ticket != null && ticket.getEventId().equals(event.getId()) 
                                    && ticket.getTicketStatus() == TicketStatus.SOLD;
                        } catch (Exception e) {
                            return false;
                        }
                    })
                    .count();
            
            // Calculate revenue from paid orders for this event
            BigDecimal revenue = orderRepository.findByStatus(OrderStatus.PAID, PageRequest.of(0, Integer.MAX_VALUE))
                    .getContent().stream()
                    .flatMap(order -> orderItemRepository.findByOrderId(order.getId()).stream())
                    .filter(oi -> {
                        try {
                            var ticket = ticketRepository.findById(oi.getTicketId()).orElse(null);
                            return ticket != null && ticket.getEventId().equals(event.getId());
                        } catch (Exception e) {
                            return false;
                        }
                    })
                    .map(oi -> oi.getPrice().multiply(BigDecimal.valueOf(oi.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            // Count total and available tickets
            long totalTickets = ticketRepository.findByEventId(event.getId(), PageRequest.of(0, Integer.MAX_VALUE))
                    .getContent().size();
            long availableTickets = ticketRepository.findByEventId(event.getId(), PageRequest.of(0, Integer.MAX_VALUE))
                    .getContent().stream()
                    .filter(t -> t.getTicketStatus() == TicketStatus.AVAILABLE)
                    .count();
            
            eventSales.add(EventSaleResponse.builder()
                    .eventId(event.getId())
                    .eventName(event.getName())
                    .ticketsSold(ticketsSold)
                    .revenue(revenue)
                    .availableTickets(availableTickets)
                    .totalTickets(totalTickets)
                    .build());
        }
        
        return eventSales;
    }
    
    @Override
    public List<RevenueDataResponse> getRevenueData(String period) {
        log.debug("Getting revenue data for period: {}", period);
        
        // Parse period (e.g., "30d", "7d", "90d")
        int days = parsePeriod(period);
        LocalDateTime endDate = LocalDateTime.now();
        LocalDateTime startDate = endDate.minusDays(days);
        
        // Get paid orders in the period
        List<OrderEntity> paidOrders = orderRepository.findByStatusAndOrderDateBetween(
                OrderStatus.PAID, startDate, endDate, PageRequest.of(0, Integer.MAX_VALUE))
                .getContent();
        
        // Group by date
        var revenueByDate = paidOrders.stream()
                .collect(Collectors.groupingBy(
                        order -> order.getOrderDate().toLocalDate(),
                        Collectors.reducing(
                                BigDecimal.ZERO,
                                OrderEntity::getTotalAmount,
                                BigDecimal::add
                        )
                ));
        
        // Count tickets sold by date
        var ticketsByDate = paidOrders.stream()
                .flatMap(order -> orderItemRepository.findByOrderId(order.getId()).stream())
                .collect(Collectors.groupingBy(
                        oi -> {
                            var order = orderRepository.findById(oi.getOrderId()).orElse(null);
                            return order != null ? order.getOrderDate().toLocalDate() : LocalDate.now();
                        },
                        Collectors.summingLong(OrderItemEntity::getQuantity)
                ));
        
        // Build response list
        List<RevenueDataResponse> revenueData = new ArrayList<>();
        for (LocalDate date = startDate.toLocalDate(); !date.isAfter(endDate.toLocalDate()); date = date.plusDays(1)) {
            BigDecimal revenue = revenueByDate.getOrDefault(date, BigDecimal.ZERO);
            Long ticketsSold = ticketsByDate.getOrDefault(date, 0L);
            
            revenueData.add(RevenueDataResponse.builder()
                    .date(date)
                    .revenue(revenue)
                    .ticketsSold(ticketsSold)
                    .build());
        }
        
        return revenueData;
    }

    /**
     * Parses period string to number of days.
     * 
     * @param period period string (e.g., "30d", "7d", "90d")
     * @return number of days
     */
    private int parsePeriod(String period) {
        if (period == null || period.isEmpty()) {
            return 30; // Default to 30 days
        }
        
        try {
            // Remove 'd' suffix if present
            String daysStr = period.replaceAll("[^0-9]", "");
            return Integer.parseInt(daysStr);
        } catch (NumberFormatException e) {
            log.warn("Invalid period format: {}, defaulting to 30 days", period);
            return 30;
        }
    }
}

