package com.accessplus.eventpro.api.checkout;

import com.accessplus.eventpro.api.config.TaxProperties;
import com.accessplus.eventpro.api.dto.*;
import com.accessplus.eventpro.api.wallet.service.WalletService;
import com.accessplus.eventpro.event.addon.repository.EventAddonRepository;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.event.ticket.repository.TicketRepository;
import com.accessplus.eventpro.event.ticket.service.TicketService;
import com.accessplus.eventpro.order.cart.entity.CartEntity;
import com.accessplus.eventpro.order.cart.service.CartService;
import com.accessplus.eventpro.order.order.service.OrderService;
import com.accessplus.eventpro.payment.stripe.service.StripeService;
import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.*;
import com.accessplus.eventpro.shared.exception.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.model.PaymentIntent;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CheckoutSessionService {
    private static final int MAX_GA_QUANTITY = 4;
    private final CheckoutSessionRepository sessionRepository;
    private final CheckoutSessionTicketRepository sessionTicketRepository;
    private final CartService cartService;
    private final TicketService ticketService;
    private final TicketRepository ticketRepository;
    private final EventAddonRepository addonRepository;
    private final OrderService orderService;
    private final StripeService stripeService;
    private final WalletService walletService;
    private final TaxProperties taxProperties;
    private final ObjectMapper objectMapper;
    private final CheckoutOutboxService outboxService;
    private final UserRepository userRepository;
    private final Clock clock;

    @Value("${eventpro.ticket.reservation-expiry-minutes:15}") private int holdMinutes;
    @Value("${eventpro.web-base-url:http://localhost:5173}") private String webBaseUrl;
    @Value("${eventpro.checkout.resume-token-secret:local-checkout-resume-secret-change-me}") private String resumeTokenSecret;

    public record Created(CheckoutSessionEntity session, String clientSecret, String resumeToken) {}

    @Transactional
    public Created create(UUID userId, CreateCheckoutSessionRequest request) {
        Optional<CheckoutSessionEntity> previous = sessionRepository.findByIdempotencyKey(request.getIdempotencyKey());
        if (previous.isPresent()) {
            boolean sameAuthenticatedOwner = userId != null && userId.equals(previous.get().getUserId());
            boolean sameGuestOwner = userId == null && previous.get().getUserId() == null
                    && Objects.equals(trim(request.getEmail()), previous.get().getGuestEmail());
            if (!sameAuthenticatedOwner && !sameGuestOwner) {
                throw new ConflictException("IDEMPOTENCY_KEY_IN_USE");
            }
            String token = deterministicToken(request.getIdempotencyKey());
            return new Created(previous.get(), clientSecret(previous.get()), token);
        }
        if (userId != null) userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));
        if (userId != null && sessionRepository.existsByUserIdAndStatus(userId, CheckoutSessionStatus.PENDING)) {
            throw new ConflictException("CHECKOUT_IN_PROGRESS: cancel or complete the active checkout first");
        }

        LocalDateTime now = utcNow();
        LocalDateTime deadline;
        List<TicketEntity> tickets;
        if (userId != null) {
            List<CartEntity> cart = cartService.getUserCart(userId);
            if (cart.isEmpty()) throw new ValidationException("Cart is empty");
            tickets = cart.stream().map(CartEntity::getTicket).filter(Objects::nonNull).toList();
            deadline = tickets.stream().map(TicketEntity::getReservedUntil).filter(Objects::nonNull)
                    .min(Comparator.naturalOrder()).orElseThrow(() -> new ValidationException("Cart hold is missing"));
        } else {
            validateGuest(request);
            deadline = now.plusMinutes(holdMinutes);
            tickets = reserveGuestTickets(request.getItems(), deadline);
        }
        if (!deadline.isAfter(now)) throw new ConflictException("CHECKOUT_EXPIRED: reservation has expired");

        BigDecimal ticketSubtotal = tickets.stream().map(TicketEntity::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        Set<UUID> selectedEvents = new HashSet<>();
        tickets.forEach(t -> selectedEvents.add(t.getEventId()));
        BigDecimal addonAmount = calculateAddons(request.getAddOns(), selectedEvents);
        BigDecimal donation = money(request.getDonationAmount());
        BigDecimal subtotal = ticketSubtotal.add(addonAmount).add(donation).setScale(2, RoundingMode.HALF_UP);
        double rate = taxProperties.getRateForState(request.getState());
        BigDecimal tax = subtotal.multiply(BigDecimal.valueOf(rate))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(tax).setScale(2, RoundingMode.HALF_UP);
        BigDecimal requestedWallet = money(request.getWalletAmount());
        if (userId == null && requestedWallet.signum() > 0) throw new ValidationException("Guest checkout cannot use wallet funds");
        if (requestedWallet.compareTo(total) > 0) throw new ValidationException("Wallet amount cannot exceed checkout total");
        BigDecimal wallet = userId == null ? BigDecimal.ZERO : requestedWallet;
        if (wallet.signum() > 0 && walletService.getBalance(userId).getBalance().compareTo(wallet) < 0) {
            throw new ValidationException("Insufficient Electric Wallet balance");
        }

        String resumeToken = deterministicToken(request.getIdempotencyKey());
        CheckoutSessionEntity session = new CheckoutSessionEntity();
        session.setUserId(userId);
        session.setIdempotencyKey(request.getIdempotencyKey());
        session.setResumeTokenHash(hash(resumeToken));
        session.setStatus(CheckoutSessionStatus.PENDING);
        session.setExpiresAt(deadline);
        session.setGuestEmail(trim(request.getEmail()));
        session.setGuestFirstName(trim(request.getFirstName()));
        session.setGuestLastName(trim(request.getLastName()));
        session.setBuyerState(upper(request.getState()));
        session.setBuyerCountry(upper(request.getCountry()));
        session.setSubtotal(ticketSubtotal.setScale(2, RoundingMode.HALF_UP));
        session.setAddonAmount(addonAmount);
        session.setDonationAmount(donation);
        session.setTaxAmount(tax);
        session.setTotalAmount(total);
        session.setWalletAmount(wallet);
        try { session.setAdjustmentsJson(objectMapper.writeValueAsString(request.getAddOns())); }
        catch (Exception e) { throw new ValidationException("Invalid add-on selection"); }
        session = sessionRepository.saveAndFlush(session);

        for (TicketEntity ticket : tickets) {
            CheckoutSessionTicketEntity line = new CheckoutSessionTicketEntity();
            line.setCheckoutSessionId(session.getId());
            line.setTicketId(ticket.getId());
            line.setEventId(ticket.getEventId());
            line.setTicketType(ticket.getTicketType());
            line.setPrice(ticket.getPrice());
            sessionTicketRepository.save(line);
        }

        String clientSecret = null;
        BigDecimal stripeAmount = total.subtract(wallet);
        if (stripeAmount.signum() > 0) {
            try {
                StripeService.CreatedPaymentIntent intent = stripeService.createPaymentIntent(
                        stripeAmount, "usd", Map.of("checkout_session_id", session.getId().toString()),
                        "checkout:" + request.getIdempotencyKey());
                session.setPaymentIntentId(intent.id());
                sessionRepository.save(session);
                clientSecret = intent.clientSecret();
            } catch (Exception e) {
                throw new ValidationException("Unable to initialize payment: " + e.getMessage());
            }
        }
        return new Created(session, clientSecret, resumeToken);
    }

    @Transactional
    public CheckoutSessionEntity resume(String rawToken) {
        CheckoutSessionEntity session = sessionRepository.findByResumeTokenHash(hash(rawToken))
                .orElseThrow(() -> new ResourceNotFoundException("Checkout session", "resume token"));
        if (session.getStatus() == CheckoutSessionStatus.PENDING && !session.getExpiresAt().isAfter(utcNow())) {
            session.setStatus(CheckoutSessionStatus.EXPIRED);
            releaseSessionTickets(session);
            sessionRepository.save(session);
        }
        return session;
    }

    public String clientSecret(CheckoutSessionEntity session) {
        if (session.getPaymentIntentId() == null || session.getStatus() != CheckoutSessionStatus.PENDING) return null;
        try { return stripeService.retrievePaymentIntent(session.getPaymentIntentId()).getClientSecret(); }
        catch (Exception e) { throw new ValidationException("Unable to resume payment"); }
    }

    @Transactional
    public CheckoutSessionEntity finalizeSession(UUID sessionId, UUID requestingUserId,
                                                 String resumeToken, String paymentIntentId) {
        CheckoutSessionEntity session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Checkout session", sessionId.toString()));
        assertAccess(session, requestingUserId, resumeToken);
        return finalizeLocked(session, paymentIntentId);
    }

    private CheckoutSessionEntity finalizeLocked(CheckoutSessionEntity session, String paymentIntentId) {
        if (session.getStatus() == CheckoutSessionStatus.COMPLETED) return session;

        PaymentIntent intent = null;
        if (session.getPaymentIntentId() != null) {
            if (paymentIntentId != null && !session.getPaymentIntentId().equals(paymentIntentId)) {
                throw new ValidationException("PaymentIntent does not belong to this checkout session");
            }
            try { intent = stripeService.retrievePaymentIntent(session.getPaymentIntentId()); }
            catch (Exception e) { throw new ValidationException("Unable to verify payment"); }
            if (!"succeeded".equals(intent.getStatus())) throw new ConflictException("PAYMENT_NOT_SUCCEEDED");
            verifyIntent(session, intent);
        }

        if (session.getStatus() != CheckoutSessionStatus.PENDING) {
            if (intent != null && EnumSet.of(CheckoutSessionStatus.CANCELLED,
                    CheckoutSessionStatus.EXPIRED, CheckoutSessionStatus.PAYMENT_FAILED,
                    CheckoutSessionStatus.REFUND_PENDING).contains(session.getStatus())) {
                refund(session);
                return sessionRepository.save(session);
            }
            return session;
        }

        if (!session.getExpiresAt().isAfter(utcNow())) {
            if (intent != null) refund(session);
            else session.setStatus(CheckoutSessionStatus.EXPIRED);
            releaseSessionTickets(session);
            return sessionRepository.save(session);
        }

        List<UUID> ticketIds = sessionTicketRepository.findByCheckoutSessionIdOrderByCreatedAt(session.getId())
                .stream().map(CheckoutSessionTicketEntity::getTicketId).toList();
        List<TicketEntity> lockedTickets = ticketIds.isEmpty()
                ? List.of() : ticketRepository.findAllByIdForUpdate(ticketIds);
        boolean inventoryValid = lockedTickets.size() == ticketIds.size()
                && lockedTickets.stream().allMatch(ticket -> ticket.getTicketStatus() == TicketStatus.RESERVED
                        && ticket.getReservedUntil() != null && ticket.getReservedUntil().isAfter(utcNow()));
        if (!inventoryValid) {
            if (intent != null) refund(session);
            else session.setStatus(CheckoutSessionStatus.PAYMENT_FAILED);
            releaseSessionTickets(session);
            return sessionRepository.save(session);
        }

        if (session.getWalletAmount().signum() > 0) {
            try {
                walletService.debit(session.getUserId(), session.getWalletAmount(), WalletService.REF_CHECKOUT,
                        session.getId(), "checkout-session:" + session.getId(), "Ticket purchase");
            } catch (RuntimeException debitFailure) {
                if (intent != null) refund(session);
                else session.setStatus(CheckoutSessionStatus.PAYMENT_FAILED);
                releaseSessionTickets(session);
                return sessionRepository.save(session);
            }
        }
        OrderEntity order = orderService.createOrderFromReservedTickets(
                session.getUserId(), session.getGuestEmail(), session.getGuestFirstName(), session.getGuestLastName(),
                ticketIds, session.getTotalAmount(), session.getTaxAmount(), session.getDonationAmount(),
                session.getBuyerState(), session.getBuyerCountry());
        String method = session.getPaymentIntentId() == null ? "WALLET"
                : session.getWalletAmount().signum() > 0 ? "MIXED" : "STRIPE";
        order = orderService.updatePaymentDetails(order.getId(), session.getPaymentIntentId(),
                session.getWalletAmount(), method);
        order = orderService.updateOrderStatus(order.getId(), OrderStatus.PAID);
        orderService.markOrderTicketsAsSold(order);
        outboxService.enqueueIssuance(order);
        session.setOrderId(order.getId());
        session.setStatus(CheckoutSessionStatus.COMPLETED);
        return sessionRepository.save(session);
    }

    @Transactional
    public CheckoutSessionEntity finalizeByPaymentIntent(String paymentIntentId) {
        CheckoutSessionEntity found = sessionRepository.findByPaymentIntentId(paymentIntentId)
                .orElseThrow(() -> new ResourceNotFoundException("Checkout session", paymentIntentId));
        CheckoutSessionEntity session = sessionRepository.findByIdForUpdate(found.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Checkout session", found.getId().toString()));
        return finalizeLocked(session, paymentIntentId);
    }

    @Transactional
    public CheckoutSessionEntity cancel(UUID id, UUID userId, String resumeToken) {
        CheckoutSessionEntity session = sessionRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Checkout session", id.toString()));
        assertAccess(session, userId, resumeToken);
        if (session.getStatus() == CheckoutSessionStatus.PENDING) {
            session.setStatus(CheckoutSessionStatus.CANCELLED);
            if (session.getUserId() == null) releaseSessionTickets(session);
        }
        return sessionRepository.save(session);
    }

    @Transactional
    public int expireDueSessions() {
        List<CheckoutSessionEntity> due = sessionRepository.findDueForExpiry(utcNow());
        for (CheckoutSessionEntity session : due) {
            session.setStatus(CheckoutSessionStatus.EXPIRED);
            releaseSessionTickets(session);
            sessionRepository.save(session);
        }
        return due.size();
    }

    public String checkoutUrl(String token) { return webBaseUrl.replaceAll("/$", "") + "/checkout/session/" + token; }

    private List<TicketEntity> reserveGuestTickets(List<GuestOrderItemRequest> items, LocalDateTime deadline) {
        Map<String, Integer> gaTotals = new HashMap<>();
        for (GuestOrderItemRequest item : items) {
            String selector = item.getTicketType().trim();
            if (!isUuid(selector)) {
                String key = item.getEventId() + ":" + selector.toUpperCase();
                int total = gaTotals.merge(key, item.getQuantity(), Integer::sum);
                if (total > MAX_GA_QUANTITY) throw new ValidationException("Maximum four GA tickets per event/type");
            }
        }
        List<TicketEntity> tickets = new ArrayList<>();
        for (GuestOrderItemRequest item : items) {
            String selector = item.getTicketType().trim();
            if (isUuid(selector)) {
                if (item.getQuantity() != 1) throw new ValidationException("Reserved seat items must have quantity 1");
                UUID id = UUID.fromString(selector);
                TicketEntity ticket = ticketService.getTicketById(id);
                if (!ticket.getEventId().equals(item.getEventId())) throw new ValidationException("Seat belongs to another event");
                ticketService.markTicketAsReserved(id, deadline);
                tickets.add(ticket);
            } else {
                if (item.getQuantity() > MAX_GA_QUANTITY) throw new ValidationException("Maximum four GA tickets per type");
                TicketType type;
                try { type = TicketType.valueOf(selector.toUpperCase()); }
                catch (Exception e) { throw new ValidationException("Invalid ticket type: " + selector); }
                List<UUID> ids = ticketService.findAndReserveAvailableTickets(item.getEventId(), type, item.getQuantity(), deadline);
                if (ids.size() != item.getQuantity()) throw new ConflictException("INSUFFICIENT_INVENTORY");
                ids.forEach(id -> tickets.add(ticketService.getTicketById(id)));
            }
        }
        return tickets;
    }

    private BigDecimal calculateAddons(List<CreateCheckoutSessionRequest.AddonSelection> selections, Set<UUID> eventIds) {
        BigDecimal result = BigDecimal.ZERO;
        if (selections == null) return result;
        for (var selection : selections) {
            var addon = addonRepository.findById(selection.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Event add-on", selection.getId().toString()));
            if (!eventIds.contains(addon.getEvent().getId())) throw new ValidationException("Add-on belongs to another event");
            result = result.add(addon.getPrice().multiply(BigDecimal.valueOf(selection.getQuantity())));
        }
        return result.setScale(2, RoundingMode.HALF_UP);
    }

    private void verifyIntent(CheckoutSessionEntity session, PaymentIntent intent) {
        long expected = session.getTotalAmount().subtract(session.getWalletAmount())
                .movePointRight(2).longValueExact();
        if (!Objects.equals(intent.getAmount(), expected) || !"usd".equalsIgnoreCase(intent.getCurrency()))
            throw new ValidationException("Payment amount or currency does not match checkout session");
        if (!session.getId().toString().equals(intent.getMetadata().get("checkout_session_id")))
            throw new ValidationException("Payment metadata does not match checkout session");
    }

    private void refund(CheckoutSessionEntity session) {
        try {
            session.setRefundId(stripeService.refundPayment(session.getPaymentIntentId(),
                    "checkout-refund:" + session.getId()));
            session.setStatus(CheckoutSessionStatus.REFUNDED);
        } catch (Exception e) {
            session.setStatus(CheckoutSessionStatus.REFUND_PENDING);
        }
    }

    private void releaseSessionTickets(CheckoutSessionEntity session) {
        List<CheckoutSessionTicketEntity> lines = sessionTicketRepository
                .findByCheckoutSessionIdOrderByCreatedAt(session.getId());
        if (session.getUserId() != null) {
            cartService.releaseCartTicketsForCheckout(session.getUserId(),
                    lines.stream().map(CheckoutSessionTicketEntity::getTicketId).toList());
            return;
        }
        for (var line : lines) {
            TicketEntity ticket = ticketRepository.findById(line.getTicketId()).orElse(null);
            if (ticket != null && ticket.getTicketStatus() == TicketStatus.RESERVED) ticketService.markTicketAsAvailable(ticket.getId());
        }
    }

    private void assertAccess(CheckoutSessionEntity session, UUID userId, String token) {
        if (session.getUserId() != null && session.getUserId().equals(userId)) return;
        if (token != null && MessageDigest.isEqual(hash(token).getBytes(StandardCharsets.UTF_8),
                session.getResumeTokenHash().getBytes(StandardCharsets.UTF_8))) return;
        throw new UnauthorizedException("Checkout session access denied");
    }

    private static void validateGuest(CreateCheckoutSessionRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) throw new ValidationException("Guest items are required");
        if (trim(request.getEmail()) == null || trim(request.getFirstName()) == null || trim(request.getLastName()) == null)
            throw new ValidationException("Guest name and email are required");
    }
    private static BigDecimal money(BigDecimal value) { return value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP); }
    private static String trim(String s) { return s == null || s.isBlank() ? null : s.trim(); }
    private static String upper(String s) { String v = trim(s); return v == null ? null : v.toUpperCase(); }
    private static boolean isUuid(String s) { try { UUID.fromString(s); return true; } catch (Exception e) { return false; } }
    private LocalDateTime utcNow() { return LocalDateTime.now(clock); }
    private String deterministicToken(String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(resumeTokenSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(("resume:" + key).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Unable to create checkout resume token", e);
        }
    }
    private static String hash(String value) { return HexFormat.of().formatHex(digest(value)); }
    private static byte[] digest(String value) {
        try { return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
}
