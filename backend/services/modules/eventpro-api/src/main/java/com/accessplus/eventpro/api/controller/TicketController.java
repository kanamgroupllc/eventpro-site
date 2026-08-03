package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.dto.ApiResponse;
import com.accessplus.eventpro.api.dto.EventSummary;
import com.accessplus.eventpro.api.dto.EventTickets;
import com.accessplus.eventpro.api.dto.TicketCreateRequest;
import com.accessplus.eventpro.api.dto.TicketInfo;
import com.accessplus.eventpro.api.dto.TicketResponse;
import com.accessplus.eventpro.api.dto.TicketUpdateRequest;
import com.accessplus.eventpro.shared.exception.ValidationException;
import com.accessplus.eventpro.core.security.JwtUtils;
import com.accessplus.eventpro.core.user.service.UserService;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.TicketType;
import com.accessplus.eventpro.event.ticket.service.TicketService;
import com.accessplus.eventpro.event.ticket.service.TicketPdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/tickets")
@RequiredArgsConstructor
@Tag(name = "Tickets", description = "Ticket management API")
public class TicketController extends BaseController {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final TicketService ticketService;
    private final TicketPdfService ticketPdfService;
    private final EventRepository eventRepository;
    private final UserService userService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('ORGANIZER')")
    @Operation(summary = "Create tickets in bulk", description = "Creates multiple tickets for an event. " +
            "Requires ADMIN or ORGANIZER role. Each TicketInfo in the request creates the specified quantity of tickets.")
    @SecurityRequirement(name = "bearerAuth")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<ApiResponse<List<TicketResponse>>> createTickets(
            @Valid @RequestBody TicketCreateRequest request) {
        log.debug("Creating tickets in bulk: eventId={}, ticketCount={}", 
                request.getEventId(), request.getTickets().size());

        // Get current user (creator)
        UUID userId = JwtUtils.getCurrentUserId();
        com.accessplus.eventpro.core.user.entity.UserEntity creator = userService.getUserById(userId);

        // Validate event exists
        eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new com.accessplus.eventpro.shared.exception.ResourceNotFoundException(
                        "Event", request.getEventId().toString()));

        // Create tickets for each TicketInfo
        List<TicketEntity> allCreatedTickets = new ArrayList<>();
        for (TicketInfo ticketInfo : request.getTickets()) {
            // Validate eventId matches
            if (!request.getEventId().equals(ticketInfo.getEventId())) {
                throw new ValidationException(
                        String.format("TicketInfo eventId (%s) must match request eventId (%s)", 
                                ticketInfo.getEventId(), request.getEventId()));
            }

            // Create tickets in bulk for this TicketInfo
            List<TicketEntity> tickets = ticketService.createTickets(
                    request.getEventId(),
                    creator.getId(),
                    ticketInfo.getTicketType(),
                    ticketInfo.getPrice(),
                    ticketInfo.getQuantity().intValue(),
                    null, // name - will be auto-generated
                    null, // startTime
                    null  // endTime
            );
            allCreatedTickets.addAll(tickets);
        }

        // Convert to response DTOs
        List<TicketResponse> responses = allCreatedTickets.stream()
                .map(TicketResponse::fromEntity)
                .collect(Collectors.toList());

        log.info("Successfully created {} tickets for event: eventId={}", 
                allCreatedTickets.size(), request.getEventId());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(responses, "Tickets created successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get ticket by ID", description = "Returns ticket details by ID. Public endpoint.")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getTicketById(@PathVariable UUID id) {
        log.debug("Getting ticket by ID: {}", id);

        TicketEntity ticket = ticketService.getTicketById(id);
        TicketResponse response = TicketResponse.fromEntity(ticket);

        // Return as list per README.md specification
        return ResponseEntity.ok(ApiResponse.success(List.of(response)));
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Download ticket as PDF", description = "Downloads a ticket as PDF with QR code. " +
            "Users can only download their own tickets. Admins can download any ticket. " +
            "Requires USER, ADMIN, or ORGANIZER role.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<byte[]> downloadTicket(@PathVariable UUID id) {
        log.debug("Downloading ticket as PDF: ticketId={}", id);

        // Get ticket
        TicketEntity ticket = ticketService.getTicketById(id);

        // Check authorization: user can only download their own tickets, admin can download any
        UUID currentUserId = JwtUtils.getCurrentUserId();
        boolean isAdmin = hasAdminRole();

        if (!isAdmin && (ticket.getPurchaserId() == null || !ticket.getPurchaserId().equals(currentUserId))) {
            throw new com.accessplus.eventpro.shared.exception.ResourceNotFoundException("Ticket", id.toString());
        }

        try {
            // Generate PDF
            byte[] pdfBytes = ticketPdfService.generateTicketPdf(ticket);

            // Set response headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "ticket-" + id + ".pdf");
            headers.setContentLength(pdfBytes.length);

            log.info("Ticket PDF generated successfully: ticketId={}, size={} bytes", id, pdfBytes.length);
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfBytes);

        } catch (IOException e) {
            log.error("Failed to generate PDF ticket: ticketId={}, error={}", id, e.getMessage(), e);
            throw new com.accessplus.eventpro.shared.exception.ValidationException("Failed to generate PDF: " + e.getMessage());
        }
    }

    private boolean hasAdminRole() {
        org.springframework.security.core.Authentication authentication = 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }
        
        return authentication.getAuthorities().stream()
                .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                .anyMatch(authority -> authority.equals("ROLE_ADMIN"));
    }

    @GetMapping("/event/{eventId}")
    @Operation(summary = "Get tickets for event", description = "Returns all tickets for a specific event. Public endpoint.")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getTicketsByEvent(
            @PathVariable UUID eventId) {
        log.debug("Getting tickets for event: eventId={}", eventId);

        // Get all tickets (no pagination per README.md specification)
        Pageable pageable = PageRequest.of(0, Integer.MAX_VALUE);
        Page<TicketEntity> ticketPage = ticketService.getTicketsByEvent(eventId, pageable);
        
        List<TicketResponse> responses = ticketPage.getContent().stream()
                .map(TicketResponse::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/groupTickets/{eventId}")
    @Operation(summary = "Get tickets grouped by type", description = "Returns tickets for an event grouped by ticket type. Public endpoint.")
    public ResponseEntity<ApiResponse<Map<TicketType, List<TicketResponse>>>> getGroupedTickets(
            @PathVariable UUID eventId) {
        log.debug("Getting grouped tickets for event: eventId={}", eventId);

        Map<TicketType, List<TicketEntity>> groupedTickets = ticketService.groupTicketsByType(eventId);
        
        // Convert to response DTOs
        Map<TicketType, List<TicketResponse>> groupedResponses = groupedTickets.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> entry.getValue().stream()
                                .map(TicketResponse::fromEntity)
                                .collect(Collectors.toList())
                ));

        return ResponseEntity.ok(ApiResponse.success(groupedResponses));
    }

    @GetMapping("/group/{eventId}")
    @Operation(summary = "Get ticket summary", description = "Returns a summary of event tickets with counts by type. Public endpoint.")
    public ResponseEntity<ApiResponse<EventSummary>> getTicketSummary(@PathVariable UUID eventId) {
        log.debug("Getting ticket summary for event: eventId={}", eventId);

        // Get event
        EventEntity event = eventRepository.findById(eventId)
                .orElseThrow(() -> new com.accessplus.eventpro.shared.exception.ResourceNotFoundException(
                        "Event", eventId.toString()));

        // Get grouped tickets
        Map<TicketType, List<TicketEntity>> groupedTickets = ticketService.groupTicketsByType(eventId);

        // Build EventTickets list
        List<EventTickets> eventTicketsList = new ArrayList<>();
        for (Map.Entry<TicketType, List<TicketEntity>> entry : groupedTickets.entrySet()) {
            TicketType type = entry.getKey();
            List<TicketEntity> tickets = entry.getValue();
            
            // Get price from first ticket of this type (assuming all tickets of same type have same price)
            if (!tickets.isEmpty()) {
                EventTickets eventTickets = EventTickets.builder()
                        .ticketType(type)
                        .price(tickets.get(0).getPrice())
                        .count(tickets.size())
                        .build();
                eventTicketsList.add(eventTickets);
            }
        }

        // Build EventSummary
        EventSummary summary = EventSummary.builder()
                .eventName(event.getName())
                .startTime(event.getStartTime() != null ? event.getStartTime().format(DATE_TIME_FORMATTER) : null)
                .endTime(event.getEndTime() != null ? event.getEndTime().format(DATE_TIME_FORMATTER) : null)
                .tickets(eventTicketsList)
                .build();

        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ORGANIZER')")
    @Operation(summary = "Update ticket", description = "Updates an existing ticket. " +
            "Requires ADMIN or ORGANIZER role. All fields are optional.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<TicketResponse>> updateTicket(
            @PathVariable UUID id,
            @Valid @RequestBody TicketUpdateRequest request) {
        log.debug("Updating ticket: id={}", id);

        // Update ticket via service
        TicketEntity updatedTicket = ticketService.updateTicket(
                id,
                request.getName(),
                request.getPrice(),
                request.getTicketType(),
                request.getStartTime(),
                request.getEndTime(),
                request.getPrintOutUrl()
        );

        TicketResponse response = TicketResponse.fromEntity(updatedTicket);
        return ResponseEntity.ok(ApiResponse.success(response, "Ticket updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ORGANIZER')")
    @Operation(summary = "Delete ticket", description = "Deletes a ticket by ID. " +
            "Requires ADMIN or ORGANIZER role.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> deleteTicket(@PathVariable UUID id) {
        log.debug("Deleting ticket: id={}", id);

        ticketService.deleteTicket(id);
        
        return ResponseEntity.ok(ApiResponse.success(null, "Ticket deleted successfully"));
    }
}
