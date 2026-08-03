package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.dto.*;
import com.accessplus.eventpro.api.payout.dto.ConnectOnboardingRequest;
import com.accessplus.eventpro.api.payout.dto.PayoutRequestResponse;
import com.accessplus.eventpro.api.payout.dto.RequestPayoutRequest;
import com.accessplus.eventpro.api.payout.service.PayoutRequestService;
import com.accessplus.eventpro.payment.stripe.service.StripeService;
import com.accessplus.eventpro.api.service.OrganizerService;
import com.accessplus.eventpro.api.service.TaxFormPdfService;
import com.accessplus.eventpro.api.team.service.OrganizerTeamService;
import com.accessplus.eventpro.api.service.RiskScoringService;
import com.accessplus.eventpro.api.service.VerificationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.accessplus.eventpro.core.security.JwtUtils;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.event.category.entity.CategoryEntity;
import com.accessplus.eventpro.event.category.repository.CategoryRepository;
import com.accessplus.eventpro.event.addon.entity.EventAddonEntity;
import com.accessplus.eventpro.event.addon.repository.EventAddonRepository;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.event.event.service.EventService;
import com.accessplus.eventpro.api.eventimage.entity.EventImageEntity;
import com.accessplus.eventpro.api.eventimage.repository.EventImageRepository;
import com.accessplus.eventpro.event.ticket.service.TicketService;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.shared.exception.ValidationException;
import com.accessplus.eventpro.event.service.AWSS3ImageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.stripe.exception.StripeException;

import static org.springframework.http.HttpHeaders.CONTENT_DISPOSITION;


@Slf4j
@RestController
@RequestMapping("/api/v1/organizer")
@RequiredArgsConstructor
@Tag(name = "Organizer", description = "Organizer management API")
@SecurityRequirement(name = "bearerAuth")
public class OrganizerController extends BaseController {

    private final OrganizerService organizerService;
    private final VerificationService verificationService;
    private final RiskScoringService riskScoringService;
    private final EventService eventService;
    private final TicketService ticketService;
    private final EventRepository eventRepository;
    private final EventAddonRepository eventAddonRepository;
    private final CategoryRepository categoryRepository;
    private final AWSS3ImageService imageService;
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;
    private final OrganizerTeamService organizerTeamService;
    private final TaxFormPdfService taxFormPdfService;
    private final PayoutRequestService payoutRequestService;
    private final EventImageRepository eventImageRepository;
    private final StripeService stripeService;

    /** Merchandise & add-ons require Pro or Enterprise per pricing page. */
    private void requireAddonsEligible() {
        UUID userId = JwtUtils.getCurrentUserId();
        UserEntity user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));
        String tier = user.getSubscriptionTier() != null ? user.getSubscriptionTier().toUpperCase() : "BASIC";
        if (!"PRO".equals(tier) && !"ENTERPRISE".equals(tier)) {
            throw new AccessDeniedException("Merchandise and add-ons require a Pro or Enterprise plan. Upgrade at /pricing.");
        }
    }

    private void requireEmailAttendeesEligible() {
        UUID userId = JwtUtils.getCurrentUserId();
        UserEntity user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));
        String tier = user.getSubscriptionTier() != null ? user.getSubscriptionTier().toUpperCase() : "BASIC";
        if (!"PRO".equals(tier) && !"ENTERPRISE".equals(tier)) {
            throw new AccessDeniedException("Email ticket holders is available on Pro and Enterprise plans. Upgrade at /pricing.");
        }
    }

    private void requireTeamEligible() {
        UUID userId = JwtUtils.getCurrentUserId();
        UserEntity user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));
        String tier = user.getSubscriptionTier() != null ? user.getSubscriptionTier().toUpperCase() : "BASIC";
        if (!"PRO".equals(tier) && !"ENTERPRISE".equals(tier)) {
            throw new AccessDeniedException("Team management is available on Pro and Enterprise plans. Upgrade at /pricing.");
        }
    }

    private void requireReservedSeatingEligible() {
        UUID userId = JwtUtils.getCurrentUserId();
        UserEntity user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));
        String tier = user.getSubscriptionTier() != null ? user.getSubscriptionTier().toUpperCase() : "BASIC";
        if (!"PRO".equals(tier) && !"ENTERPRISE".equals(tier)) {
            throw new AccessDeniedException("Reserved seating is available on Pro and Enterprise plans. Upgrade at /pricing.");
        }
    }

    private boolean canManageEvent(UUID currentUserId, EventEntity event) {
        return event != null && organizerTeamService.canManageEvent(currentUserId, event.getOrganizer().getId());
    }

    @GetMapping("/team")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "List team members", description = "Returns team members who can manage your events. Pro and Enterprise only.")
    public ResponseEntity<ApiResponse<List<TeamMemberResponse>>> listTeamMembers() {
        requireTeamEligible();
        UUID organizerId = JwtUtils.getCurrentUserId();
        List<TeamMemberResponse> members = organizerTeamService.listMembers(organizerId);
        return ResponseEntity.ok(ApiResponse.success(members));
    }

    @PostMapping("/team")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Invite team member", description = "Add a user by email to your team. User must already have an account. Pro and Enterprise only.")
    public ResponseEntity<ApiResponse<TeamMemberResponse>> inviteTeamMember(@Valid @RequestBody InviteTeamMemberRequest request) {
        requireTeamEligible();
        UUID organizerId = JwtUtils.getCurrentUserId();
        TeamMemberResponse member = organizerTeamService.addMember(organizerId, request.getEmail().trim(), request.getRole());
        return ResponseEntity.ok(ApiResponse.success(member, "Team member added"));
    }

    @DeleteMapping("/team/{userId}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Remove team member", description = "Removes a user from your team. Pro and Enterprise only.")
    public ResponseEntity<ApiResponse<Void>> removeTeamMember(@PathVariable UUID userId) {
        requireTeamEligible();
        UUID organizerId = JwtUtils.getCurrentUserId();
        organizerTeamService.removeMember(organizerId, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Team member removed"));
    }

    @PutMapping("/team/{userId}/role")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Update team member role", description = "Changes a team member's role (ADMIN, EDITOR, VIEWER). Pro and Enterprise only.")
    public ResponseEntity<ApiResponse<TeamMemberResponse>> updateTeamMemberRole(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> body) {
        requireTeamEligible();
        String role = body != null ? body.get("role") : null;
        if (role == null || role.isBlank()) {
            throw new ValidationException("role is required");
        }
        UUID organizerId = JwtUtils.getCurrentUserId();
        TeamMemberResponse member = organizerTeamService.updateMemberRole(organizerId, userId, role.trim());
        return ResponseEntity.ok(ApiResponse.success(member, "Role updated"));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Get organizer summary", description = "Returns events hosted, tickets sold, trend and financial state for Profile/Organizer dashboard.")
    public ResponseEntity<ApiResponse<OrganizerSummaryResponse>> getOrganizerSummary() {
        UUID organizerId = JwtUtils.getCurrentUserId();
        OrganizerSummaryResponse summary = organizerService.getOrganizerSummary(organizerId);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @PostMapping("/payouts/request")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Request payout", description = "Submit a payout request for the given amount. Validates available balance and eligibility (verified, W-9 if $600+). Actual transfer is processed separately.")
    public ResponseEntity<ApiResponse<PayoutRequestResponse>> requestPayout(@Valid @RequestBody RequestPayoutRequest request) {
        UUID organizerId = JwtUtils.getCurrentUserId();
        PayoutRequestResponse response = payoutRequestService.requestPayout(organizerId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Payout requested. You will be notified when it is processed."));
    }

    @GetMapping("/payouts")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "List payout requests", description = "Returns the organizer's payout requests (pending and completed).")
    public ResponseEntity<ApiResponse<Page<PayoutRequestResponse>>> getPayoutRequests(Pageable pageable) {
        UUID organizerId = JwtUtils.getCurrentUserId();
        Page<PayoutRequestResponse> page = payoutRequestService.getPayoutRequests(organizerId, pageable);
        return ResponseEntity.ok(ApiResponse.success(page));
    }

    @PostMapping("/payouts/connect-onboarding")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Start Connect onboarding", description = "Returns a URL to redirect the user to Stripe Connect onboarding to add their bank account for payouts. Creates a Connect Express account if the user does not have one yet.")
    public ResponseEntity<ApiResponse<Map<String, String>>> connectOnboarding(@Valid @RequestBody ConnectOnboardingRequest request) {
        UUID organizerId = JwtUtils.getCurrentUserId();
        UserEntity user = userRepository.findById(organizerId).orElseThrow(() -> new ResourceNotFoundException("User", organizerId.toString()));
        String accountId = user.getStripeConnectAccountId();
        try {
            if (accountId == null || accountId.isBlank()) {
                String name = ((user.getFirstName() != null ? user.getFirstName() : "") + " " + (user.getLastName() != null ? user.getLastName() : "")).trim();
                if (name.isEmpty()) name = user.getEmail();
                accountId = stripeService.createConnectExpressAccount(user.getEmail(), name);
                user.setStripeConnectAccountId(accountId);
                userRepository.save(user);
            }
            String url = stripeService.createConnectAccountLink(accountId, request.getReturnUrl(), request.getRefreshUrl());
            return ResponseEntity.ok(ApiResponse.success(Map.of("url", url)));
        } catch (StripeException e) {
            log.warn("Stripe Connect onboarding failed: {}", e.getMessage());
            throw new ValidationException("Could not start payout setup. Please try again or contact support.");
        }
    }

    @GetMapping("/payouts/connect-status")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Connect account status", description = "Returns whether the organizer has connected a payout (bank) account.")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> getConnectStatus() {
        UUID organizerId = JwtUtils.getCurrentUserId();
        UserEntity user = userRepository.findById(organizerId).orElseThrow(() -> new ResourceNotFoundException("User", organizerId.toString()));
        boolean connected = user.getStripeConnectAccountId() != null && !user.getStripeConnectAccountId().isBlank();
        return ResponseEntity.ok(ApiResponse.success(Map.of("connected", connected)));
    }

    @GetMapping("/verification-status")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Get verification status", description = "Returns KYC verification status and risk level for Profile badge and payout gate.")
    public ResponseEntity<ApiResponse<VerificationStatusResponse>> getVerificationStatus() {
        UUID organizerId = JwtUtils.getCurrentUserId();
        VerificationStatusResponse status = verificationService.getStatus(organizerId);
        return ResponseEntity.ok(ApiResponse.success(status));
    }

    @PostMapping("/risk-score/recalculate")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Recalculate risk score", description = "Recomputes organizer risk level (LOW/MEDIUM/HIGH) from KYC, event history, and ticket price band. Used for payout eligibility.")
    public ResponseEntity<ApiResponse<Map<String, String>>> recalculateRiskScore() {
        UUID organizerId = JwtUtils.getCurrentUserId();
        String riskLevel = riskScoringService.computeAndUpdateRiskScore(organizerId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("riskLevel", riskLevel), "Risk score updated"));
    }

    @PostMapping("/verification")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Submit KYC verification", description = "Submits identity check (legal entity, address, ID document session). Sets status to PENDING.")
    public ResponseEntity<ApiResponse<String>> submitVerification(@Valid @RequestBody SubmitVerificationRequest request) {
        UUID organizerId = JwtUtils.getCurrentUserId();
        verificationService.submitVerification(organizerId, request);
        return ResponseEntity.ok(ApiResponse.success("Verification submitted. You will be notified when the review is complete.", "Verification submitted"));
    }

    @GetMapping("/tax-forms")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "List tax forms (1099-K)", description = "Returns list of tax forms by year for Document Vault. Enterprise only per pricing. 1099-K for a year is available after IRS deadline (Jan 31 of following year).")
    public ResponseEntity<ApiResponse<List<TaxFormResponse>>> getTaxForms() {
        UUID organizerId = JwtUtils.getCurrentUserId();
        UserEntity user = userRepository.findById(organizerId).orElseThrow(() -> new ResourceNotFoundException("User", organizerId.toString()));
        if (!"ENTERPRISE".equalsIgnoreCase(user.getSubscriptionTier())) {
            return ResponseEntity.ok(ApiResponse.success(java.util.Collections.emptyList()));
        }
        int currentYear = java.time.Year.now().getValue();
        java.time.LocalDate now = java.time.LocalDate.now();
        // IRS: 1099-K for year Y is due to recipient by Jan 31 of year Y+1. So e.g. 2025 form is "Available" from Feb 1, 2026.
        java.time.LocalDate deadlinePriorYear = java.time.LocalDate.of(currentYear, 1, 31);
        java.util.List<TaxFormResponse> forms = new java.util.ArrayList<>();
        if (now.isAfter(deadlinePriorYear)) {
            forms.add(TaxFormResponse.builder()
                    .year(String.valueOf(currentYear - 1))
                    .formType("1099-K")
                    .status("Available")
                    .downloadUrl("/api/v1/organizer/tax-forms/" + (currentYear - 1) + "/download")
                    .build());
        }
        // Current year form: show as pending until next year's deadline
        forms.add(TaxFormResponse.builder()
                .year(String.valueOf(currentYear))
                .formType("1099-K")
                .status("Available after Jan 31, " + (currentYear + 1))
                .downloadUrl(null)
                .build());
        return ResponseEntity.ok(ApiResponse.success(forms));
    }

    @GetMapping("/tax-forms/{year}/download")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Download 1099-K PDF", description = "Generates and returns 1099-K PDF for the given tax year. Enterprise only. Available only for years past IRS deadline (Jan 31 of following year).")
    public ResponseEntity<byte[]> downloadTaxFormPdf(@PathVariable int year) {
        UUID organizerId = JwtUtils.getCurrentUserId();
        UserEntity user = userRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", organizerId.toString()));
        if (!"ENTERPRISE".equalsIgnoreCase(user.getSubscriptionTier())) {
            throw new AccessDeniedException("1099-K reports are available on the Enterprise plan.");
        }
        int currentYear = java.time.Year.now().getValue();
        java.time.LocalDate now = java.time.LocalDate.now();
        java.time.LocalDate deadline = java.time.LocalDate.of(year + 1, 1, 31);
        if (year >= currentYear || !now.isAfter(deadline)) {
            throw new ValidationException("1099-K for " + year + " is not available for download until after Jan 31, " + (year + 1));
        }
        java.math.BigDecimal grossAmount = organizerService.getOrganizerRevenueForYear(organizerId, year);
        java.math.BigDecimal feesWithheld = organizerService.getOrganizerFeesForYear(organizerId, year);
        java.math.BigDecimal subscriptionPaymentsForYear = organizerService.getOrganizerSubscriptionPaymentsForYear(organizerId, year);
        String recipientName = (user.getFirstName() != null ? user.getFirstName() + " " : "") + (user.getLastName() != null ? user.getLastName() : "").trim();
        if (recipientName.isBlank()) recipientName = user.getEmail();
        if (recipientName == null) recipientName = "—";
        try {
            byte[] pdfBytes = taxFormPdfService.generate1099KPdf(recipientName, user.getEmail(), year, grossAmount, feesWithheld, subscriptionPaymentsForYear);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "1099-K-" + year + ".pdf");
            headers.setContentLength(pdfBytes.length);
            return ResponseEntity.ok().headers(headers).body(pdfBytes);
        } catch (java.io.IOException e) {
            log.error("Failed to generate 1099-K PDF: year={}, error={}", year, e.getMessage(), e);
            throw new ValidationException("Failed to generate PDF: " + e.getMessage());
        }
    }

    @PostMapping("/w9")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Submit W-9", description = "Records W-9 submission for 1099-K compliance. Payouts unlocked when over $600 threshold.")
    public ResponseEntity<ApiResponse<String>> submitW9(@Valid @RequestBody SubmitW9Request request) {
        UUID organizerId = JwtUtils.getCurrentUserId();
        UserEntity user = userRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", organizerId.toString()));
        if (Boolean.TRUE.equals(user.getW9Submitted())) {
            return ResponseEntity.ok(ApiResponse.success("Tax information already on file.", "W-9 on file"));
        }
        user.setW9Submitted(true);
        userRepository.save(user);
        log.info("W-9 submitted for organizer: {}", organizerId);
        return ResponseEntity.ok(ApiResponse.success("Tax information received. You're set for 1099-K reporting.", "W-9 submitted"));
    }

    @GetMapping("/events")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Get organizer's events", description = "Returns events the user can manage (owned or as team member). Requires ORGANIZER or ADMIN role.")
    public ResponseEntity<ApiResponse<List<EventResponse>>> getOrganizerEvents() {
        log.debug("Getting organizer's events");

        UUID currentUserId = JwtUtils.getCurrentUserId();
        Set<UUID> organizerIds = organizerTeamService.getOrganizerIdsAccessibleByUser(currentUserId);

        Pageable pageable = PageRequest.of(0, Integer.MAX_VALUE);
        Page<EventEntity> eventPage = eventService.getEventsByOrganizerIds(organizerIds, pageable);

        List<EventResponse> responses = eventPage.getContent().stream()
                .map(EventResponse::fromEntity)
                .toList();

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @PostMapping("/events")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Create new event", description = "Creates a new event. Requires ORGANIZER or ADMIN role.")
    public ResponseEntity<ApiResponse<EventResponse>> createEvent(
            @Valid @RequestBody CreateEventRequest request) {
        log.debug("Creating new event: name={}", request.getName());

        // Get current user's UUID from JWT
        UUID organizerId = JwtUtils.getCurrentUserId();

        // Resolve category by UUID or name
        UUID categoryId = resolveCategoryId(request.getCategory());

        // Create event (aligned with EventController logic)
        EventEntity event = new EventEntity();
        event.setName(request.getName());
        event.setDescription(request.getDescription());
        event.setStartTime(request.getStartTime());
        event.setEndTime(request.getEndTime());
        event.setMarketingEnabled(request.getMarketingEnabled() != null ? request.getMarketingEnabled() : false);
        if (request.getPromotionalVideoUrl() != null) {
            event.setPromotionalVideoUrl(request.getPromotionalVideoUrl().trim().isEmpty() ? null : request.getPromotionalVideoUrl().trim());
        }
        if (request.getEventPageTemplate() != null) {
            event.setEventPageTemplate(request.getEventPageTemplate().trim().isEmpty() ? "DEFAULT" : request.getEventPageTemplate().trim());
        }
        if (Boolean.TRUE.equals(request.getDonationsEnabled())) {
            requireAddonsEligible();
            event.setDonationsEnabled(true);
        } else {
            event.setDonationsEnabled(false);
        }
        if (request.getCustomDomain() != null && !request.getCustomDomain().trim().isEmpty()) {
            requireAddonsEligible();
            event.setCustomDomain(request.getCustomDomain().trim());
        }
        if (Boolean.TRUE.equals(request.getReservedSeatingEnabled())) {
            requireReservedSeatingEligible();
            event.setReservedSeatingEnabled(true);
        } else {
            event.setReservedSeatingEnabled(false);
        }

        // Set address if provided
        if (request.getAddress() != null) {
            event.setAddress(request.getAddress().toEntity());
        }

        try {
            EventEntity createdEvent = eventService.createEvent(
                    event,
                    organizerId,
                    categoryId,
                    null // imageFile - handled separately
            );
            EventResponse response = EventResponse.fromEntity(createdEvent);
            return ResponseEntity.ok(ApiResponse.success(response, "Event created successfully"));
        } catch (Exception e) {
            log.error("Failed to create event: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create event: " + e.getMessage());
        }
    }

    @PutMapping("/events/{id}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Update event", description = "Updates an event. Requires ORGANIZER or ADMIN role.")
    public ResponseEntity<ApiResponse<EventResponse>> updateEvent(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateEventRequest request) throws IOException {
        log.debug("Updating event: eventId={}", id);

        // Get current user's UUID from JWT
        UUID organizerId = JwtUtils.getCurrentUserId();

        // Verify current user can manage this event (owner or team member)
        EventEntity event = eventRepository.findByIdWithOrganizer(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", id.toString()));
        if (!canManageEvent(organizerId, event)) {
            throw new ResourceNotFoundException("Event", id.toString());
        }

        // Create event entity from request
        EventEntity eventUpdate = new EventEntity();
        eventUpdate.setName(request.getName());
        eventUpdate.setDescription(request.getDescription());
        eventUpdate.setStartTime(request.getStartTime());
        eventUpdate.setEndTime(request.getEndTime());
        eventUpdate.setMarketingEnabled(request.getMarketingEnabled() != null ? request.getMarketingEnabled() : false);
        if (request.getImageUrl() != null) {
            eventUpdate.setImageUrl(request.getImageUrl());
        }
        if (request.getPromotionalVideoUrl() != null) {
            eventUpdate.setPromotionalVideoUrl(request.getPromotionalVideoUrl().trim().isEmpty() ? null : request.getPromotionalVideoUrl().trim());
        }
        if (request.getEventPageTemplate() != null) {
            eventUpdate.setEventPageTemplate(request.getEventPageTemplate().trim().isEmpty() ? "DEFAULT" : request.getEventPageTemplate().trim());
        }
        if (request.getDonationsEnabled() != null) {
            if (Boolean.TRUE.equals(request.getDonationsEnabled())) {
                requireAddonsEligible();
            }
            eventUpdate.setDonationsEnabled(request.getDonationsEnabled());
        }
        if (request.getCustomDomain() != null) {
            if (!request.getCustomDomain().trim().isEmpty()) {
                requireAddonsEligible();
                eventUpdate.setCustomDomain(request.getCustomDomain().trim());
            } else {
                eventUpdate.setCustomDomain(null);
            }
        }
        if (request.getReservedSeatingEnabled() != null) {
            if (Boolean.TRUE.equals(request.getReservedSeatingEnabled())) {
                requireReservedSeatingEligible();
            }
            eventUpdate.setReservedSeatingEnabled(request.getReservedSeatingEnabled());
        }

        // Set address if provided
        if (request.getAddress() != null) {
            eventUpdate.setAddress(request.getAddress().toEntity());
        }

        // Resolve category by UUID or name if provided
        UUID categoryId = null;
        if (request.getCategory() != null && !request.getCategory().trim().isEmpty()) {
            categoryId = resolveCategoryId(request.getCategory());
        }

        // Update event (no image in this JSON-only endpoint; use POST /events/upload-image to change image)
        EventEntity updatedEvent = eventService.updateEvent(
                id,
                eventUpdate,
                categoryId,
                null
        );
        
        EventResponse response = EventResponse.fromEntity(updatedEvent);
        return ResponseEntity.ok(ApiResponse.success(response, "Event updated successfully"));
    }

    @PostMapping("/events/upload-image")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Upload event image", description = "Uploads an image for an event. Requires ORGANIZER or ADMIN role.")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadEventImage(
            @RequestParam("image") MultipartFile imageFile) {
        log.debug("Uploading event image");

        try {
            // Validate image
            imageService.validateImage(imageFile);

            // Generate S3 key: events/{eventId}/{filename}
            String imageKey = String.format("events/%s/%s",
                    UUID.randomUUID(),
                    imageFile.getOriginalFilename() != null ?
                            imageFile.getOriginalFilename() : "image.jpg");

            // Upload image to S3
            String imageUrl = imageService.uploadImage(imageFile, imageKey);

            Map<String, String> response = new HashMap<>();
            response.put("url", imageUrl);

            log.info("Event image uploaded successfully: url={}", imageUrl);
            return ResponseEntity.ok(ApiResponse.success(response, "Image uploaded successfully"));

        } catch (IOException e) {
            log.error("Failed to upload event image: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload image: " + e.getMessage());
        }
    }

    @PostMapping("/events/{eventId}/images")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Add event gallery image", description = "Adds an image to the event gallery. Requires ORGANIZER or ADMIN role.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addEventImage(
            @PathVariable UUID eventId,
            @Valid @RequestBody AddEventImageRequest request) {
        UUID organizerId = JwtUtils.getCurrentUserId();
        EventEntity event = eventRepository.findByIdWithOrganizer(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));
        if (!canManageEvent(organizerId, event)) {
            throw new ResourceNotFoundException("Event", eventId.toString());
        }
        long galleryCount = eventImageRepository.countByEventId(eventId);
        if (galleryCount >= 4) {
            throw new ValidationException("Event can have at most 5 images (1 cover + 4 gallery). Remove an image to add another.");
        }
        int order = request.getDisplayOrder() != null ? request.getDisplayOrder() : (int) galleryCount;
        EventImageEntity img = new EventImageEntity();
        img.setEventId(eventId);
        img.setImageUrl(request.getImageUrl().trim());
        img.setDisplayOrder(order);
        eventImageRepository.save(img);
        Map<String, Object> data = new HashMap<>();
        data.put("id", img.getId());
        data.put("imageUrl", img.getImageUrl());
        data.put("displayOrder", img.getDisplayOrder());
        return ResponseEntity.ok(ApiResponse.success(data, "Image added."));
    }

    @DeleteMapping("/events/{eventId}/images/{imageId}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Remove event gallery image", description = "Removes an image from the event gallery.")
    public ResponseEntity<ApiResponse<Void>> removeEventImage(
            @PathVariable UUID eventId,
            @PathVariable UUID imageId) {
        UUID organizerId = JwtUtils.getCurrentUserId();
        EventEntity event = eventRepository.findByIdWithOrganizer(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));
        if (!canManageEvent(organizerId, event)) {
            throw new ResourceNotFoundException("Event", eventId.toString());
        }
        EventImageEntity img = eventImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("Event image", imageId.toString()));
        if (!img.getEventId().equals(eventId)) {
            throw new ResourceNotFoundException("Event image", imageId.toString());
        }
        eventImageRepository.delete(img);
        return ResponseEntity.ok(ApiResponse.success(null, "Image removed."));
    }

    @PostMapping("/events/{eventId}/seat-map")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Create seat map", description = "Creates seat tickets for an event with reserved seating. Pro/Enterprise only. Event must have reservedSeatingEnabled.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createSeatMap(
            @PathVariable UUID eventId,
            @Valid @RequestBody CreateSeatMapRequest request) {
        requireReservedSeatingEligible();
        UUID organizerId = JwtUtils.getCurrentUserId();
        EventEntity event = eventRepository.findByIdWithOrganizer(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));
        if (!canManageEvent(organizerId, event)) {
            throw new ResourceNotFoundException("Event", eventId.toString());
        }
        if (!Boolean.TRUE.equals(event.getReservedSeatingEnabled())) {
            throw new ValidationException("Enable reserved seating on the event first, then create the seat map.");
        }
        List<TicketService.SeatSectionSpec> specs = request.getSections().stream()
                .map(s -> new TicketService.SeatSectionSpec(
                        s.getName(),
                        s.getRowCount(),
                        s.getSeatsPerRow(),
                        s.getPrice()))
                .toList();
        int count = ticketService.createSeatMap(eventId, organizerId, specs);
        Map<String, Object> data = new HashMap<>();
        data.put("seatsCreated", count);
        return ResponseEntity.ok(ApiResponse.success(data, count + " seat(s) created"));
    }

    @GetMapping("/events/{id}/stats")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Get event statistics", description = "Returns statistics for an event. Requires ORGANIZER or ADMIN role.")
    public ResponseEntity<ApiResponse<EventStatsResponse>> getEventStats(@PathVariable UUID id) {
        log.debug("Getting event stats: eventId={}", id);

        // Get current user's UUID from JWT
        UUID organizerId = JwtUtils.getCurrentUserId();

        EventEntity event = eventRepository.findByIdWithOrganizer(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", id.toString()));
        if (!canManageEvent(organizerId, event)) {
            throw new ResourceNotFoundException("Event", id.toString());
        }
        EventStatsResponse stats = organizerService.getEventStats(id, event.getOrganizer().getId());
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Export data", description = "Export attendees, check-in list, marketing emails, or financial summary. CCPA/GDPR compliant.")
    public ResponseEntity<byte[]> exportData(
            @RequestParam(defaultValue = "attendees") String type,
            @RequestParam(defaultValue = "csv") String format) {
        UUID organizerId = JwtUtils.getCurrentUserId();
        byte[] data = organizerService.exportData(organizerId, type, format);
        String filename = "export-" + type + "." + (format != null ? format.toLowerCase() : "csv");
        if ("checkin".equalsIgnoreCase(type)) filename = "check-in-list.csv";
        if ("marketing".equalsIgnoreCase(type)) filename = "marketing-emails.csv";
        if ("financial".equalsIgnoreCase(type)) filename = "financial-summary.csv";
        return ResponseEntity.ok()
                .header(CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(data);
    }

    @GetMapping("/feed/recent-sales")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Recent ticket sales", description = "Live feed of recent ticket purchases for organizer's events.")
    public ResponseEntity<ApiResponse<List<RecentSaleResponse>>> getRecentSales(
            @RequestParam(defaultValue = "20") int limit) {
        UUID organizerId = JwtUtils.getCurrentUserId();
        List<RecentSaleResponse> sales = organizerService.getRecentSales(organizerId, Math.min(limit, 50));
        return ResponseEntity.ok(ApiResponse.success(sales));
    }

    @GetMapping("/insights")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "AI insights", description = "Sales velocity pulses, AI insight text, and top cultural interests.")
    public ResponseEntity<ApiResponse<OrganizerInsightsResponse>> getInsights() {
        UUID organizerId = JwtUtils.getCurrentUserId();
        OrganizerInsightsResponse insights = organizerService.getInsights(organizerId);
        return ResponseEntity.ok(ApiResponse.success(insights));
    }

    @GetMapping("/events/{id}/attendees")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Get event attendees", description = "Returns attendees for an event. Requires ORGANIZER or ADMIN role (or team member).")
    public ResponseEntity<ApiResponse<List<AttendeeResponse>>> getEventAttendees(@PathVariable UUID id) {
        log.debug("Getting event attendees: eventId={}", id);
        UUID currentUserId = JwtUtils.getCurrentUserId();
        EventEntity event = eventRepository.findByIdWithOrganizer(id).orElseThrow(() -> new ResourceNotFoundException("Event", id.toString()));
        if (!canManageEvent(currentUserId, event)) {
            throw new ResourceNotFoundException("Event", id.toString());
        }
        List<AttendeeResponse> attendees = organizerService.getEventAttendees(id, event.getOrganizer().getId());
        return ResponseEntity.ok(ApiResponse.success(attendees));
    }

    @PostMapping("/events/{id}/email-attendees")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Email event attendees", description = "Sends an email to all ticket holders for this event. Pro and Enterprise only.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> emailEventAttendees(
            @PathVariable UUID id,
            @Valid @RequestBody EmailAttendeesRequest request) {
        requireEmailAttendeesEligible();
        UUID organizerId = JwtUtils.getCurrentUserId();
        EventEntity event = eventRepository.findByIdWithOrganizer(id).orElseThrow(() -> new ResourceNotFoundException("Event", id.toString()));
        if (!canManageEvent(organizerId, event)) {
            throw new ResourceNotFoundException("Event", id.toString());
        }
        int sent = organizerService.emailEventAttendees(id, event.getOrganizer().getId(), request.getSubject(), request.getBody());
        Map<String, Object> data = new HashMap<>();
        data.put("recipientsSent", sent);
        return ResponseEntity.ok(ApiResponse.success(data, "Email sent to " + sent + " attendee(s)."));
    }

    @GetMapping("/events/{eventId}/addons")
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "List event add-ons", description = "Returns add-ons for an event. Requires Pro or Enterprise plan.")
    public ResponseEntity<ApiResponse<List<EventAddonResponse>>> getEventAddons(@PathVariable UUID eventId) {
        requireAddonsEligible();
        log.debug("Getting add-ons for event: {}", eventId);
        UUID organizerId = JwtUtils.getCurrentUserId();
        EventEntity event = eventRepository.findByIdWithOrganizer(eventId).orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));
        if (!canManageEvent(organizerId, event)) {
            throw new ResourceNotFoundException("Event", eventId.toString());
        }
        List<EventAddonEntity> addons = eventAddonRepository.findByEventIdOrderByDisplayOrderAsc(eventId);
        List<EventAddonResponse> responses = addons.stream().map(EventAddonResponse::fromEntity).toList();
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @PostMapping("/events/{eventId}/addons")
    @Transactional
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Create event add-on", description = "Creates an add-on for an event. Requires Pro or Enterprise plan.")
    public ResponseEntity<ApiResponse<EventAddonResponse>> createEventAddon(
            @PathVariable UUID eventId,
            @Valid @RequestBody CreateEventAddonRequest request) throws JsonProcessingException {
        requireAddonsEligible();
        log.debug("Creating add-on for event: {}", eventId);
        UUID organizerId = JwtUtils.getCurrentUserId();
        EventEntity event = eventRepository.findByIdWithOrganizer(eventId).orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));
        if (!canManageEvent(organizerId, event)) {
            throw new ResourceNotFoundException("Event", eventId.toString());
        }
        EventAddonEntity entity = new EventAddonEntity();
        entity.setEvent(event);
        entity.setName(request.getName());
        entity.setDescription(request.getDescription());
        entity.setPrice(request.getPrice());
        entity.setCategory(request.getCategory());
        entity.setImageUrl(request.getImageUrl());
        entity.setIsPopular(request.getIsPopular() != null ? request.getIsPopular() : false);
        entity.setDisplayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0);
        if (request.getSizes() != null && !request.getSizes().isEmpty()) {
            entity.setSizesJson(objectMapper.writeValueAsString(request.getSizes()));
        }
        entity = eventAddonRepository.save(entity);
        return ResponseEntity.ok(ApiResponse.success(EventAddonResponse.fromEntity(entity), "Add-on created"));
    }

    @PutMapping("/events/{eventId}/addons/{addonId}")
    @Transactional
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Update event add-on", description = "Updates an add-on. Requires Pro or Enterprise plan.")
    public ResponseEntity<ApiResponse<EventAddonResponse>> updateEventAddon(
            @PathVariable UUID eventId,
            @PathVariable UUID addonId,
            @Valid @RequestBody UpdateEventAddonRequest request) throws JsonProcessingException {
        requireAddonsEligible();
        log.debug("Updating add-on: {}", addonId);
        UUID organizerId = JwtUtils.getCurrentUserId();
        EventEntity event = eventRepository.findByIdWithOrganizer(eventId).orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));
        if (!canManageEvent(organizerId, event)) {
            throw new ResourceNotFoundException("Event", eventId.toString());
        }
        EventAddonEntity entity = eventAddonRepository.findById(addonId).orElseThrow(() -> new ResourceNotFoundException("EventAddon", addonId.toString()));
        if (!entity.getEvent().getId().equals(eventId)) {
            throw new ResourceNotFoundException("EventAddon", addonId.toString());
        }
        if (request.getName() != null) entity.setName(request.getName());
        if (request.getDescription() != null) entity.setDescription(request.getDescription());
        if (request.getPrice() != null) entity.setPrice(request.getPrice());
        if (request.getCategory() != null) entity.setCategory(request.getCategory());
        if (request.getImageUrl() != null) entity.setImageUrl(request.getImageUrl());
        if (request.getIsPopular() != null) entity.setIsPopular(request.getIsPopular());
        if (request.getDisplayOrder() != null) entity.setDisplayOrder(request.getDisplayOrder());
        if (request.getSizes() != null) {
            entity.setSizesJson(request.getSizes().isEmpty() ? null : objectMapper.writeValueAsString(request.getSizes()));
        }
        entity = eventAddonRepository.save(entity);
        return ResponseEntity.ok(ApiResponse.success(EventAddonResponse.fromEntity(entity), "Add-on updated"));
    }

    @DeleteMapping("/events/{eventId}/addons/{addonId}")
    @Transactional
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Delete event add-on", description = "Deletes an add-on. Requires Pro or Enterprise plan.")
    public ResponseEntity<ApiResponse<Void>> deleteEventAddon(@PathVariable UUID eventId, @PathVariable UUID addonId) {
        requireAddonsEligible();
        log.debug("Deleting add-on: {}", addonId);
        UUID organizerId = JwtUtils.getCurrentUserId();
        EventEntity event = eventRepository.findByIdWithOrganizer(eventId).orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));
        if (!canManageEvent(organizerId, event)) {
            throw new ResourceNotFoundException("Event", eventId.toString());
        }
        EventAddonEntity entity = eventAddonRepository.findById(addonId).orElseThrow(() -> new ResourceNotFoundException("EventAddon", addonId.toString()));
        if (!entity.getEvent().getId().equals(eventId)) {
            throw new ResourceNotFoundException("EventAddon", addonId.toString());
        }
        eventAddonRepository.delete(entity);
        return ResponseEntity.ok(ApiResponse.success(null, "Add-on deleted"));
    }

    @PostMapping("/tickets/{id}/check-in")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Check in attendee", description = "Checks in an attendee by ticket ID (e.g. from QR scan). Returns attendee/ticket name for the check-in app.")
    public ResponseEntity<ApiResponse<CheckInResponse>> checkInAttendee(@PathVariable UUID id) {
        log.debug("Checking in attendee: ticketId={}", id);

        TicketEntity ticket = ticketService.getTicketById(id);
        EventEntity event = eventRepository.findByIdWithOrganizer(ticket.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event", ticket.getEventId().toString()));
        UUID organizerId = JwtUtils.getCurrentUserId();
        if (!canManageEvent(organizerId, event)) {
            throw new ResourceNotFoundException("Ticket", id.toString());
        }

        try {
            ticketService.checkInTicket(id);
        } catch (IllegalStateException e) {
            if (e.getMessage() != null && e.getMessage().contains("already checked in")) {
                CheckInResponse already = organizerService.getCheckInResult(id, organizerId);
                return ResponseEntity.ok(ApiResponse.success(already, "Already checked in"));
            }
            throw e;
        }

        CheckInResponse result = organizerService.getCheckInResult(id, organizerId);
        log.info("Attendee checked in: ticketId={}, attendee={}", id, result.getAttendeeName());
        return ResponseEntity.ok(ApiResponse.success(result, "Checked in successfully"));
    }

    private UUID resolveCategoryId(String categoryIdentifier) {
        if (categoryIdentifier == null || categoryIdentifier.trim().isEmpty()) {
            throw new ValidationException("Category is required");
        }

        // Try to parse as UUID first
        try {
            UUID categoryUuid = UUID.fromString(categoryIdentifier);
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

    @PostMapping("/events/{eventId}/tickets")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Create tickets for event", description = "Creates tickets for an event. Requires ORGANIZER or ADMIN role.")
    public ResponseEntity<ApiResponse<List<TicketEntity>>> createTickets(
            @PathVariable UUID eventId,
            @Valid @RequestBody CreateTicketsRequest request) {
        log.debug("Creating tickets: eventId={}, type={}, quantity={}", eventId, request.getTicketType(), request.getQuantity());

        // Get current user's UUID from JWT
        UUID organizerId = JwtUtils.getCurrentUserId();

        // Verify event exists and user can manage it (owner or team member)
        EventEntity event = eventRepository.findByIdWithOrganizer(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));
        if (!canManageEvent(organizerId, event)) {
            throw new ValidationException("You can only create tickets for events you manage");
        }

        // Create tickets using the ticket service (use event owner as organizer for ticket records)
        List<TicketEntity> createdTickets = ticketService.createTickets(
                eventId,
                event.getOrganizer().getId(),
                request.getTicketType(),
                request.getPrice(),
                request.getQuantity(),
                request.getName() != null ? request.getName() : request.getTicketType().name() + " Ticket",
                request.getSaleStartDate(),
                request.getSaleEndDate()
        );

        log.info("Successfully created {} tickets for event: eventId={}", createdTickets.size(), eventId);
        return ResponseEntity.ok(ApiResponse.success(createdTickets,
                createdTickets.size() + " tickets created successfully"));
    }
}
