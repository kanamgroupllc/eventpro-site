package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.dto.ApiResponse;
import com.accessplus.eventpro.api.dto.ContactOrganizerRequest;
import com.accessplus.eventpro.api.dto.CreateEventRequest;
import com.accessplus.eventpro.api.dto.EventAddonResponse;
import com.accessplus.eventpro.api.dto.EventResponse;
import com.accessplus.eventpro.api.dto.SeatResponse;
import com.accessplus.eventpro.api.dto.TicketTypeResponse;
import com.accessplus.eventpro.api.dto.UpdateEventRequest;
import com.accessplus.eventpro.api.checkout.CheckoutSessionService;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.shared.exception.ValidationException;
import com.accessplus.eventpro.core.email.service.EmailService;
import com.accessplus.eventpro.core.security.JwtUtils;
import com.accessplus.eventpro.core.user.service.UserService;
import com.accessplus.eventpro.event.category.entity.CategoryEntity;
import com.accessplus.eventpro.event.category.repository.CategoryRepository;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.addon.entity.EventAddonEntity;
import com.accessplus.eventpro.event.addon.repository.EventAddonRepository;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.event.event.service.EventService;
import com.accessplus.eventpro.api.eventimage.entity.EventImageEntity;
import com.accessplus.eventpro.api.eventimage.repository.EventImageRepository;
import com.accessplus.eventpro.event.ticket.service.TicketService;
import com.accessplus.eventpro.event.service.AWSS3ImageService;
import com.accessplus.eventpro.order.cart.service.CartService;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.EventStatus;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import com.accessplus.eventpro.shared.enums.TicketType;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@Tag(name = "Events", description = "Event management API")
public class EventController extends BaseController {

    private final EventService eventService;
    private final UserService userService;
    private final CategoryRepository categoryRepository;
    private final EventRepository eventRepository;
    private final EventAddonRepository eventAddonRepository;
    private final TicketService ticketService;
    private final EmailService emailService;
    private final EventImageRepository eventImageRepository;
    private final ObjectMapper objectMapper;
    private final AWSS3ImageService imageService;
    private final CartService cartService;
    private final CheckoutSessionService checkoutSessionService;

    private static final int MAX_EVENT_IMAGES = 5;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('ORGANIZER')")
    @Operation(summary = "Create event", description = "Creates a new event with optional image uploads (max 5). " +
            "Requires ADMIN or ORGANIZER role. Content-Type must be multipart/form-data with 'request' (JSON string) and optional 'imageFiles' (multiple, max 5).")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<EventResponse>> createEvent(
            @RequestPart("request") String requestJson,
            @RequestPart(value = "imageFiles", required = false) List<MultipartFile> imageFiles,
            @RequestPart(value = "imageFile", required = false) MultipartFile imageFile) {
        // Support both single (legacy) and multiple: normalize to list, max 5
        List<MultipartFile> files = new ArrayList<>();
        if (imageFiles != null && !imageFiles.isEmpty()) {
            for (MultipartFile f : imageFiles) {
                if (f != null && !f.isEmpty()) files.add(f);
            }
        }
        if (files.isEmpty() && imageFile != null && !imageFile.isEmpty()) {
            files.add(imageFile);
        }
        if (files.size() > MAX_EVENT_IMAGES) {
            throw new ValidationException("Maximum " + MAX_EVENT_IMAGES + " event images allowed.");
        }
        log.debug("Creating event with {} image(s)", files.size());

        try {
            // Parse JSON request
            CreateEventRequest request = objectMapper.readValue(requestJson, CreateEventRequest.class);
            
            // Validate request
            validateCreateRequest(request);
            
            // Get current user (organizer)
            UUID userId = JwtUtils.getCurrentUserId();
            com.accessplus.eventpro.core.user.entity.UserEntity organizer = userService.getUserById(userId);
            
            // Resolve category (by UUID or name)
            UUID categoryId = resolveCategoryId(request.getCategory());
            
            // Create EventEntity from request
            EventEntity event = new EventEntity();
            event.setName(request.getName());
            event.setDescription(request.getDescription());
            event.setStartTime(request.getStartTime());
            event.setEndTime(request.getEndTime());
            event.setMarketingEnabled(request.getMarketingEnabled() != null ? request.getMarketingEnabled() : false);
            if (request.getPromotionalVideoUrl() != null && !request.getPromotionalVideoUrl().trim().isEmpty()) {
                event.setPromotionalVideoUrl(request.getPromotionalVideoUrl().trim());
            }
            if (request.getEventPageTemplate() != null && !request.getEventPageTemplate().trim().isEmpty()) {
                event.setEventPageTemplate(request.getEventPageTemplate().trim());
            }
            String tier = organizer.getSubscriptionTier() != null ? organizer.getSubscriptionTier().toUpperCase() : "BASIC";
            if ("PRO".equals(tier) || "ENTERPRISE".equals(tier)) {
                event.setDonationsEnabled(Boolean.TRUE.equals(request.getDonationsEnabled()));
                if (request.getCustomDomain() != null && !request.getCustomDomain().trim().isEmpty()) {
                    event.setCustomDomain(request.getCustomDomain().trim());
                }
            }
            
            // Set address if provided
            if (request.getAddress() != null) {
                event.setAddress(request.getAddress().toEntity());
            }
            
            // First image as primary (passed to service); rest saved as gallery after create
            MultipartFile primaryFile = files.isEmpty() ? null : files.get(0);
            EventEntity createdEvent = eventService.createEvent(
                    event,
                    organizer.getId(),
                    categoryId,
                    primaryFile
            );
            
            // Persist additional images (2–5) as gallery
            for (int i = 1; i < files.size(); i++) {
                MultipartFile f = files.get(i);
                try {
                    imageService.validateImage(f);
                    String imageKey = String.format("events/%s/%s",
                            UUID.randomUUID(),
                            f.getOriginalFilename() != null ? f.getOriginalFilename() : "image.jpg");
                    String imageUrl = imageService.uploadImage(f, imageKey);
                    EventImageEntity img = new EventImageEntity();
                    img.setEventId(createdEvent.getId());
                    img.setImageUrl(imageUrl);
                    img.setDisplayOrder(i - 1);
                    eventImageRepository.save(img);
                } catch (IOException e) {
                    log.warn("Failed to upload gallery image {}: {}", i + 1, e.getMessage());
                }
            }
            
            EventResponse response = EventResponse.fromEntity(createdEvent);
            List<String> galleryUrls = eventImageRepository.findByEventIdOrderByDisplayOrderAsc(createdEvent.getId()).stream()
                    .map(EventImageEntity::getImageUrl)
                    .collect(Collectors.toList());
            response.setAdditionalImageUrls(galleryUrls.isEmpty() ? null : galleryUrls);
            return ResponseEntity.ok(ApiResponse.success(response, "Event created successfully"));
            
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            log.error("Failed to parse request JSON: {}", e.getMessage(), e);
            throw new ValidationException("Invalid request JSON format: " + e.getMessage());
        } catch (IOException e) {
            log.error("Failed to create event: {}", e.getMessage(), e);
            throw new ValidationException("Failed to process request: " + e.getMessage());
        }
    }

    /**
     * Retrieves an event by ID.
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get event by ID", description = "Returns event details by ID. Public endpoint. Loads organizer for white-label branding.")
    public ResponseEntity<ApiResponse<EventResponse>> getEventById(@PathVariable UUID id) {
        log.debug("Getting event by ID: {}", id);

        EventEntity event = eventRepository.findByIdWithOrganizer(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", id.toString()));
        EventResponse response = EventResponse.fromEntity(event);
        List<String> galleryUrls = eventImageRepository.findByEventIdOrderByDisplayOrderAsc(id).stream()
                .map(img -> img.getImageUrl())
                .collect(Collectors.toList());
        response.setAdditionalImageUrls(galleryUrls.isEmpty() ? null : galleryUrls);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{id}/contact")
    @Operation(summary = "Contact organizer", description = "Sends a message to the event organizer. Public endpoint. Organizer email is not exposed.")
    public ResponseEntity<ApiResponse<Void>> contactOrganizer(
            @PathVariable UUID id,
            @Valid @RequestBody ContactOrganizerRequest request) {
        log.debug("Contact organizer for event: {}", id);

        EventEntity event = eventRepository.findByIdWithOrganizer(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", id.toString()));
        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw new ValidationException("Event is not available for contact.");
        }
        if (event.getOrganizer() == null || event.getOrganizer().getEmail() == null || event.getOrganizer().getEmail().isBlank()) {
            log.warn("Cannot send contact message: event {} has no organizer email", id);
            throw new ValidationException("Organizer contact is not available for this event.");
        }

        String organizerEmail = event.getOrganizer().getEmail();
        String eventName = event.getName();
        String senderName = request.getSenderName() != null && !request.getSenderName().isBlank()
                ? request.getSenderName().trim() : "Someone";
        String subject = "KanamEvents: Message about your event \"" + eventName + "\"";
        String bodyText = String.format(
                "You received a message about your event \"%s\".%n%nFrom: %s <%s>%n%nMessage:%n%s",
                eventName, senderName, request.getSenderEmail(), request.getMessage());
        String bodyHtml = String.format(
                "<p>You received a message about your event <strong>%s</strong>.</p>" +
                "<p><strong>From:</strong> %s &lt;%s&gt;</p>" +
                "<p><strong>Message:</strong></p><p>%s</p>",
                eventName.replace("<", "&lt;").replace(">", "&gt;"),
                senderName.replace("<", "&lt;").replace(">", "&gt;"),
                request.getSenderEmail().replace("<", "&lt;").replace(">", "&gt;"),
                request.getMessage().replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>"));

        try {
            emailService.sendCustomEmail(organizerEmail, subject, bodyText, bodyHtml);
        } catch (Exception e) {
            log.error("Failed to send contact email for event {} to organizer: {}", id, e.getMessage(), e);
            throw new ValidationException("Unable to send message. Please try again later.");
        }

        return ResponseEntity.ok(ApiResponse.success(null, "Message sent."));
    }

    @GetMapping
    @Operation(summary = "Get all events", description = "Returns paginated list of PUBLISHED events. " +
            "Supports search by keyword (name) and filter by organizerId. Public endpoint - only shows published events.")
    public ResponseEntity<ApiResponse<Page<EventResponse>>> getAllEvents(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "startTime") String sortBy,
            @RequestParam(defaultValue = "asc") String dir,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UUID organizerId) {
        log.debug("Getting published events: page={}, size={}, sortBy={}, dir={}, keyword={}, organizerId={}",
                page, size, sortBy, dir, keyword, organizerId);

        // Convert page from 1-based to 0-based
        int pageIndex = page > 0 ? page - 1 : 0;

        // Validate sort direction
        Sort.Direction direction = "desc".equalsIgnoreCase(dir)
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;

        // Create pageable with sorting
        Pageable pageable = PageRequest.of(pageIndex, size, Sort.by(direction, sortBy));

        Page<EventEntity> eventPage;

        if (organizerId != null) {
            eventPage = eventRepository.findByOrganizerIdAndStatus(organizerId, EventStatus.PUBLISHED, pageable);
        } else if (keyword != null && !keyword.trim().isEmpty()) {
            eventPage = eventRepository.findByStatusAndNameContainingIgnoreCase(
                    EventStatus.PUBLISHED, keyword.trim(), pageable);
        } else {
            eventPage = eventService.getPublishedEvents(pageable);
        }

        Page<EventResponse> responsePage = eventPage.map(EventResponse::fromEntity);

        return ResponseEntity.ok(ApiResponse.success(responsePage));
    }

    @GetMapping("/category/{categoryName}")
    @Operation(summary = "Get events by category", description = "Returns list of PUBLISHED events in the specified category. " +
            "Uses category name, not ID. Public endpoint - only shows published events.")
    public ResponseEntity<ApiResponse<List<EventResponse>>> getEventsByCategory(
            @PathVariable String categoryName) {
        log.debug("Getting published events by category: {}", categoryName);

        // Find category by name
        CategoryEntity category = categoryRepository.findByName(categoryName)
                .orElseThrow(() -> new ResourceNotFoundException("Category", categoryName));

        // Get PUBLISHED events by category (no pagination for this endpoint per README.md)
        Pageable pageable = PageRequest.of(0, Integer.MAX_VALUE);
        Page<EventEntity> eventPage = eventRepository.findByCategoryIdAndStatus(
                category.getId(), EventStatus.PUBLISHED, pageable);

        List<EventResponse> responses = eventPage.getContent().stream()
                .map(EventResponse::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/{id}/ticket-types")
    @Operation(summary = "Get ticket types for event", description = "Returns ticket types with availability information for an event. Public endpoint.")
    public ResponseEntity<ApiResponse<List<TicketTypeResponse>>> getTicketTypes(@PathVariable UUID id) {
        log.debug("Getting ticket types for event: eventId={}", id);

        // Validate event exists
        EventEntity event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", id.toString()));
        releaseExpiredReservationsForEvent(id);

        // Get grouped tickets and availability
        Map<TicketType, List<TicketEntity>> groupedTickets = ticketService.groupTicketsByType(id);
        Map<TicketType, Long> availability = ticketService.checkTicketAvailability(id);

        // Build TicketTypeResponse list (only GA tickets; exclude seat-based so reserved-seating events get empty list)
        List<TicketTypeResponse> ticketTypes = new ArrayList<>();
        for (Map.Entry<TicketType, List<TicketEntity>> entry : groupedTickets.entrySet()) {
            TicketType type = entry.getKey();
            List<TicketEntity> tickets = entry.getValue();
            List<TicketEntity> gaTickets = tickets.stream().filter(t -> t.getSeatSection() == null).toList();
            if (gaTickets.isEmpty()) continue;

            {
                // Get price from first ticket (assuming all tickets of same type have same price)
                BigDecimal price = gaTickets.get(0).getPrice();
                LocalDateTime saleStartDate = gaTickets.get(0).getStartTime();
                LocalDateTime saleEndDate = gaTickets.get(0).getEndTime();
                int totalQuantity = gaTickets.size();
                long availableCount = gaTickets.stream().filter(t -> t.getTicketStatus() == TicketStatus.AVAILABLE).count();
                long reservedCount = gaTickets.stream().filter(t -> t.getTicketStatus() == TicketStatus.RESERVED).count();
                long soldCount = gaTickets.stream().filter(t -> t.getTicketStatus() == TicketStatus.SOLD).count();
                
                // Determine status
                String status;
                if (availableCount == 0) {
                    status = "SOLD_OUT";
                } else if (availableCount < totalQuantity) {
                    status = "ACTIVE";
                } else {
                    status = "ACTIVE";
                }

                TicketTypeResponse ticketType = TicketTypeResponse.builder()
                        .id(type.name()) // Use enum name as ID
                        .eventId(id)
                        .name(type.name())
                        .description(null) // Can be enhanced later
                        .price(price)
                        .totalQuantity(totalQuantity)
                        .availableQuantity((int) availableCount)
                        .reservedQuantity((int) reservedCount)
                        .soldQuantity((int) soldCount)
                        .saleStartDate(saleStartDate)
                        .saleEndDate(saleEndDate)
                        .status(status)
                        .build();

                ticketTypes.add(ticketType);
            }
        }

        return ResponseEntity.ok(ApiResponse.success(ticketTypes));
    }

    @GetMapping("/{id}/seats")
    @Operation(summary = "Get seat map", description = "Returns seats for an event with reserved seating. Public. Empty when event does not have reserved seating.")
    public ResponseEntity<ApiResponse<List<SeatResponse>>> getEventSeats(@PathVariable UUID id) {
        EventEntity event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", id.toString()));
        if (!Boolean.TRUE.equals(event.getReservedSeatingEnabled())) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }
        releaseExpiredReservationsForEvent(id);
        List<TicketEntity> seats = ticketService.getSeatsForEvent(id);
        List<SeatResponse> responses = seats.stream()
                .map(t -> SeatResponse.builder()
                        .id(t.getId())
                        .section(t.getSeatSection())
                        .row(t.getSeatRow())
                        .seatNumber(t.getSeatNumber())
                        .price(t.getPrice())
                        .status(t.getTicketStatus() != null ? t.getTicketStatus().name() : null)
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    private void releaseExpiredReservationsForEvent(UUID eventId) {
        checkoutSessionService.expireDueSessions();
        cartService.releaseAllExpiredCartReservations();
        List<UUID> releasedIds = ticketService.releaseExpiredReservationsForEvent(eventId);
        if (!releasedIds.isEmpty()) {
            cartService.removeCartItemsForTicketIds(releasedIds);
            log.debug("Released {} expired reservation(s) for event {} before inventory read", releasedIds.size(), eventId);
        }
    }

    @GetMapping("/{id}/addons")
    @Operation(summary = "Get event add-ons", description = "Returns add-ons for an event. Empty for Basic-plan organizers (Pro/Enterprise only per pricing page). Public endpoint.")
    public ResponseEntity<ApiResponse<List<EventAddonResponse>>> getEventAddons(@PathVariable UUID id) {
        log.debug("Getting add-ons for event: {}", id);
        EventEntity event = eventRepository.findByIdWithOrganizer(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", id.toString()));
        String tier = event.getOrganizer().getSubscriptionTier() != null
                ? event.getOrganizer().getSubscriptionTier().toUpperCase()
                : "BASIC";
        if (!"PRO".equals(tier) && !"ENTERPRISE".equals(tier)) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }
        List<EventAddonEntity> addons = eventAddonRepository.findByEventIdOrderByDisplayOrderAsc(id);
        List<EventAddonResponse> responses = addons.stream().map(EventAddonResponse::fromEntity).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/my-events")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Get my events", description = "Returns events where the authenticated user has purchased tickets. " +
            "Requires USER, ADMIN, or ORGANIZER role.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<EventResponse>>> getMyEvents() {
        log.debug("Getting events for current user");

        // Get current user's UUID from JWT
        UUID userId = JwtUtils.getCurrentUserId();

        // Get events where user has purchased tickets (no pagination for this endpoint)
        Pageable pageable = PageRequest.of(0, Integer.MAX_VALUE);
        Page<EventEntity> eventPage = eventService.getEventsByUserPurchases(userId, pageable);

        List<EventResponse> responses = eventPage.getContent().stream()
                .map(EventResponse::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/organizer/drafts")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    @Operation(summary = "Get organizer's draft events", description = "Returns draft events created by the authenticated organizer. " +
            "Requires ADMIN or ORGANIZER role.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<EventResponse>>> getOrganizerDrafts() {
        log.debug("Getting draft events for current organizer");

        // Get current user's UUID from JWT
        UUID userId = JwtUtils.getCurrentUserId();

        // Get draft events for organizer (no pagination)
        Pageable pageable = PageRequest.of(0, Integer.MAX_VALUE);
        Page<EventEntity> eventPage = eventService.getEventsByOrganizerAndStatus(userId, EventStatus.DRAFT, pageable);

        List<EventResponse> responses = eventPage.getContent().stream()
                .map(EventResponse::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/organizer/my-events")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    @Operation(summary = "Get organizer's all events", description = "Returns all events (draft and published) created by the authenticated organizer. " +
            "Requires ADMIN or ORGANIZER role.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<EventResponse>>> getOrganizerEvents() {
        log.debug("Getting all events for current organizer");

        // Get current user's UUID from JWT
        UUID userId = JwtUtils.getCurrentUserId();

        // Get all events for organizer (no pagination)
        Pageable pageable = PageRequest.of(0, Integer.MAX_VALUE);
        Page<EventEntity> eventPage = eventService.getEventsByOrganizer(userId, pageable);

        List<EventResponse> responses = eventPage.getContent().stream()
                .map(EventResponse::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ORGANIZER')")
    @Operation(summary = "Update event", description = "Updates an existing event. " +
            "Requires ADMIN or ORGANIZER role. All fields are optional. " +
            "imageFile can be provided as a query parameter. Can update status field.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<EventResponse>> updateEvent(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateEventRequest request,
            @RequestParam(value = "imageFile", required = false) MultipartFile imageFile) {
        log.debug("Updating event: id={}", id);

        try {
            // Create EventEntity with update fields
            EventEntity eventUpdate = new EventEntity();
            eventUpdate.setName(request.getName());
            eventUpdate.setDescription(request.getDescription());
            eventUpdate.setStartTime(request.getStartTime());
            eventUpdate.setEndTime(request.getEndTime());
            eventUpdate.setMarketingEnabled(request.getMarketingEnabled());
            eventUpdate.setStatus(request.getStatus());
            if (request.getPromotionalVideoUrl() != null) {
                eventUpdate.setPromotionalVideoUrl(request.getPromotionalVideoUrl().trim().isEmpty() ? null : request.getPromotionalVideoUrl().trim());
            }
            if (request.getEventPageTemplate() != null) {
                eventUpdate.setEventPageTemplate(request.getEventPageTemplate().trim().isEmpty() ? "DEFAULT" : request.getEventPageTemplate().trim());
            }

            // Set address if provided
            if (request.getAddress() != null) {
                eventUpdate.setAddress(request.getAddress().toEntity());
            }

            // Resolve category ID if provided
            UUID categoryId = null;
            if (request.getCategory() != null) {
                categoryId = resolveCategoryId(request.getCategory());
            }

            // Update event via service
            EventEntity updatedEvent = eventService.updateEvent(id, eventUpdate, categoryId, imageFile);

            EventResponse response = EventResponse.fromEntity(updatedEvent);
            return ResponseEntity.ok(ApiResponse.success(response, "Event updated successfully"));

        } catch (IOException e) {
            log.error("Failed to update event: {}", e.getMessage(), e);
            throw new ValidationException("Failed to update event: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ORGANIZER')")
    @Operation(summary = "Publish event", description = "Changes event status from DRAFT to PUBLISHED. " +
            "Requires ADMIN or ORGANIZER role. Validates that event has required data (image, address) before publishing.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<EventResponse>> publishEvent(@PathVariable UUID id) {
        log.debug("Publishing event: id={}", id);

        try {
            EventEntity publishedEvent = eventService.publishEvent(id);
            EventResponse response = EventResponse.fromEntity(publishedEvent);
            return ResponseEntity.ok(ApiResponse.success(response, "Event published successfully"));
        } catch (IllegalStateException e) {
            log.error("Failed to publish event: {}", e.getMessage());
            throw new ValidationException(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ORGANIZER')")
    @Operation(summary = "Delete event", description = "Deletes an event by ID. " +
            "Requires ADMIN or ORGANIZER role.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(@PathVariable UUID id) {
        log.debug("Deleting event: id={}", id);

        eventService.deleteEvent(id);
        
        return ResponseEntity.ok(ApiResponse.success(null, "Event deleted successfully"));
    }

    private UUID resolveCategoryId(String categoryIdentifier) {
        if (categoryIdentifier == null || categoryIdentifier.trim().isEmpty()) {
            throw new ValidationException("Category is required");
        }
        
        // Try to parse as UUID first
        try {
            UUID categoryUuid = UUID.fromString(categoryIdentifier);
            // Verify category exists
            categoryRepository.findById(categoryUuid)
                    .orElseThrow(() -> new ResourceNotFoundException("Category", categoryIdentifier));
            return categoryUuid;
        } catch (IllegalArgumentException e) {
            // Not a UUID, try to find by name
            CategoryEntity category = categoryRepository.findByName(categoryIdentifier)
                    .orElseThrow(() -> new ResourceNotFoundException("Category", categoryIdentifier));
            return category.getId();
        }
    }

    private void validateCreateRequest(CreateEventRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ValidationException("Event name is required");
        }
        if (request.getStartTime() == null) {
            throw new ValidationException("Event start time is required");
        }
        if (request.getEndTime() == null) {
            throw new ValidationException("Event end time is required");
        }
        if (request.getStartTime().isAfter(request.getEndTime())) {
            throw new ValidationException("Event end time must be after start time");
        }
        if (request.getCategory() == null || request.getCategory().trim().isEmpty()) {
            throw new ValidationException("Category is required");
        }
        if (request.getAddress() == null) {
            throw new ValidationException("Address is required");
        }
        if (request.getAddress().getCity() == null || request.getAddress().getCity().trim().isEmpty()) {
            throw new ValidationException("Address city is required");
        }
        if (request.getAddress().getCountry() == null || request.getAddress().getCountry().trim().isEmpty()) {
            throw new ValidationException("Address country is required");
        }
    }
}
