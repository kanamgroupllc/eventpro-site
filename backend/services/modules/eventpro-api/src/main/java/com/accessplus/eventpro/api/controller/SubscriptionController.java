package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.config.StripeSubscriptionConfig;
import com.accessplus.eventpro.api.dto.ApiResponse;
import com.accessplus.eventpro.api.dto.CreateSubscriptionCheckoutRequest;
import com.accessplus.eventpro.api.dto.UserResponse;
import com.accessplus.eventpro.core.security.JwtUtils;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.service.UserService;
import com.accessplus.eventpro.payment.stripe.service.StripeService;
import com.accessplus.eventpro.shared.exception.ValidationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Subscription;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/subscription")
@RequiredArgsConstructor
@Tag(name = "Subscription", description = "Pro/Enterprise subscription checkout")
@SecurityRequirement(name = "bearerAuth")
public class SubscriptionController extends BaseController {

    private final UserService userService;
    private final StripeService stripeService;
    private final StripeSubscriptionConfig subscriptionConfig;

    @PostMapping("/create-checkout-session")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create subscription checkout session",
            description = "Creates a Stripe Checkout Session for Pro/Enterprise. Redirect the user to the returned URL. After payment, Stripe webhooks will update the user's tier and record the payment.")
    public ResponseEntity<ApiResponse<Map<String, String>>> createCheckoutSession(
            @Valid @RequestBody CreateSubscriptionCheckoutRequest request) {
        UUID userId = JwtUtils.getCurrentUserId();
        UserEntity user = userService.getUserById(userId);

        String tier = request.getTier() != null ? request.getTier().trim().toUpperCase() : "PRO";
        String period = (request.getPeriod() != null && !request.getPeriod().isBlank())
                ? request.getPeriod().trim().toUpperCase()
                : "MONTHLY";
        if ("ENTERPRISE".equals(tier) && !"YEARLY".equals(period)) {
            throw new ValidationException("Enterprise is annual-only. Use period YEARLY.");
        }

        String priceId = subscriptionConfig.getPriceId(tier, period);
        if (priceId == null || priceId.isBlank()) {
            throw new ValidationException(
                    "Subscription pricing is not configured. Set STRIPE_PRICE_PRO_MONTHLY (and other price IDs) in your environment.");
        }

        try {
            String customerId = user.getStripeCustomerId();
            if (customerId == null || customerId.isBlank()) {
                String name = (user.getFirstName() != null ? user.getFirstName() : "") + " " + (user.getLastName() != null ? user.getLastName() : "").trim();
                customerId = stripeService.createCustomer(user.getEmail(), name.isEmpty() ? null : name);
                userService.updateStripeCustomerId(userId, customerId);
            }

            String url = stripeService.createSubscriptionCheckoutSession(
                    customerId,
                    priceId,
                    request.getSuccessUrl(),
                    request.getCancelUrl(),
                    userId.toString());

            if (url == null || url.isBlank()) {
                throw new ValidationException("Failed to create checkout session");
            }
            return ResponseEntity.ok(ApiResponse.success(Map.of("url", url)));
        } catch (StripeException e) {
            log.warn("Stripe error creating checkout session: {}", e.getMessage());
            throw new ValidationException("Payment provider error: " + e.getMessage());
        }
    }

    @PostMapping("/sync")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Sync subscription from Stripe",
            description = "Fetches the current user's active Stripe subscription and updates their tier and role (e.g. PRO + ORGANIZER). Use after payment if webhooks were not received, or to fix an already-upgraded user.")
    public ResponseEntity<ApiResponse<UserResponse>> syncSubscriptionFromStripe() {
        UUID userId = JwtUtils.getCurrentUserId();
        UserEntity user = userService.getUserById(userId);
        String customerId = user.getStripeCustomerId();
        if (customerId == null || customerId.isBlank()) {
            return ResponseEntity.ok(ApiResponse.success(
                    UserResponse.fromEntity(user),
                    "No Stripe customer linked. Tier unchanged."));
        }
        try {
            Map<String, Object> params = new HashMap<>();
            params.put("customer", customerId);
            params.put("limit", 1);
            // Check active first (paying), then trialing (14-day trial – no payment yet)
            params.put("status", "active");
            List<Subscription> subs = Subscription.list(params).getData();
            if (subs == null || subs.isEmpty()) {
                params.put("status", "trialing");
                subs = Subscription.list(params).getData();
            }
            if (subs == null || subs.isEmpty()) {
                userService.setSubscriptionTier(userId, "BASIC");
                user = userService.getUserById(userId);
                return ResponseEntity.ok(ApiResponse.success(
                        UserResponse.fromEntity(user),
                        "No active subscription. Set to BASIC."));
            }
            Subscription sub = subs.get(0);
            String priceId = null;
            if (sub.getItems() != null && sub.getItems().getData() != null && !sub.getItems().getData().isEmpty()) {
                var item = sub.getItems().getData().get(0);
                if (item.getPrice() != null && item.getPrice().getId() != null) {
                    priceId = item.getPrice().getId();
                }
            }
            String tier = subscriptionConfig.getTierFromPriceId(priceId);
            userService.setSubscriptionTierAndOrganizerRole(userId, tier);
            user = userService.getUserById(userId);
            return ResponseEntity.ok(ApiResponse.success(
                    UserResponse.fromEntity(user),
                    "Synced from Stripe: tier=" + tier + ", role updated."));
        } catch (StripeException e) {
            log.warn("Stripe error syncing subscription: {}", e.getMessage());
            throw new ValidationException("Could not sync subscription: " + e.getMessage());
        }
    }
}
