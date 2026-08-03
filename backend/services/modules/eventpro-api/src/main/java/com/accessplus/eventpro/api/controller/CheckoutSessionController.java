package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.checkout.*;
import com.accessplus.eventpro.api.dto.*;
import com.accessplus.eventpro.core.security.JwtUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/checkout-sessions")
@RequiredArgsConstructor
public class CheckoutSessionController {
    private final CheckoutSessionService checkoutSessionService;

    @PostMapping
    public ResponseEntity<ApiResponse<CheckoutSessionResponse>> create(@Valid @RequestBody CreateCheckoutSessionRequest request) {
        UUID userId = optionalUserId();
        CheckoutSessionService.Created created = checkoutSessionService.create(userId, request);
        CheckoutSessionResponse response = CheckoutSessionResponse.from(created.session());
        response.setClientSecret(created.clientSecret());
        response.setResumeToken(created.resumeToken());
        response.setCheckoutUrl(checkoutSessionService.checkoutUrl(created.resumeToken()));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/resume/{token}")
    public ResponseEntity<ApiResponse<CheckoutSessionResponse>> resume(@PathVariable String token) {
        CheckoutSessionEntity session = checkoutSessionService.resume(token);
        CheckoutSessionResponse response = CheckoutSessionResponse.from(session);
        response.setClientSecret(checkoutSessionService.clientSecret(session));
        response.setResumeToken(token);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{id}/finalize")
    public ResponseEntity<ApiResponse<CheckoutSessionResponse>> finalizeSession(
            @PathVariable UUID id, @RequestBody FinalizeCheckoutSessionRequest request) {
        CheckoutSessionEntity session = checkoutSessionService.finalizeSession(
                id, optionalUserId(), request.getResumeToken(), request.getPaymentIntentId());
        return ResponseEntity.ok(ApiResponse.success(CheckoutSessionResponse.from(session)));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<CheckoutSessionResponse>> cancel(
            @PathVariable UUID id, @RequestBody FinalizeCheckoutSessionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(CheckoutSessionResponse.from(
                checkoutSessionService.cancel(id, optionalUserId(), request.getResumeToken()))));
    }

    private static UUID optionalUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) return null;
        try { return JwtUtils.getCurrentUserId(); } catch (Exception ignored) { return null; }
    }
}
