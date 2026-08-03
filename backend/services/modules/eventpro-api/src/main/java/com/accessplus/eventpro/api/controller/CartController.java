package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.dto.AddToCartRequest;
import com.accessplus.eventpro.api.dto.ApiResponse;
import com.accessplus.eventpro.api.dto.CartItemRequest;
import com.accessplus.eventpro.api.dto.CartResponse;
import com.accessplus.eventpro.api.dto.UpdateCartRequest;
import com.accessplus.eventpro.api.dto.ImportCartRequest;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.shared.exception.ValidationException;
import com.accessplus.eventpro.core.security.JwtUtils;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import com.accessplus.eventpro.shared.enums.TicketType;
import com.accessplus.eventpro.event.ticket.repository.TicketRepository;
import com.accessplus.eventpro.order.cart.entity.CartEntity;
import com.accessplus.eventpro.order.cart.service.CartService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/cart")
@RequiredArgsConstructor
@Tag(name = "Cart", description = "Shopping cart management API")
@SecurityRequirement(name = "bearerAuth")
public class CartController extends BaseController {

    private final CartService cartService;
    private final TicketRepository ticketRepository;
    private final EventRepository eventRepository;

    @PostMapping("/add")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Add item to cart", description = "Adds a ticket to the authenticated user's cart. " +
            "Requires USER, ADMIN, or ORGANIZER role. Can specify ticket by UUID or by event ID + ticket type.")
    public ResponseEntity<ApiResponse<CartResponse>> addToCart(
            @Valid @RequestBody AddToCartRequest request) {
        log.debug("Received request to add item to cart: {}", request);

        // Get current user's UUID from JWT
        UUID userId = JwtUtils.getCurrentUserId();

        if (request.getId() != null) {
            cartService.addItemToCart(userId, request.getId(), request.getQuantity());
        } else if (request.getEventIdType() != null && request.getTicketType() != null) {
            try {
                UUID eventId = UUID.fromString(request.getEventIdType());
                cartService.addGeneralAdmission(userId, eventId, request.getTicketType(), request.getQuantity());
            } catch (IllegalArgumentException e) {
                throw new ValidationException("Invalid event ID format: " + request.getEventIdType());
            }
        } else {
            throw new ValidationException("Either 'id' (ticket UUID) or 'eventIdType' + 'ticketType' must be provided");
        }

        CartResponse response = currentCart(userId);
        response.setMessage("Item added to cart successfully");

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Item added to cart successfully"));
    }

    @PostMapping("/general-admission/{eventId}/{ticketType}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Add a GA quantity delta", description = "Reserves the exact physical ticket delta, up to four per event/type.")
    public ResponseEntity<ApiResponse<CartResponse>> addGeneralAdmission(
            @PathVariable UUID eventId,
            @PathVariable TicketType ticketType,
            @Valid @RequestBody UpdateCartRequest request) {
        UUID userId = JwtUtils.getCurrentUserId();
        cartService.addGeneralAdmission(userId, eventId, ticketType, request.getQuantity());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(currentCart(userId), "Tickets reserved successfully"));
    }

    @PutMapping("/general-admission/{eventId}/{ticketType}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Set an absolute GA quantity")
    public ResponseEntity<ApiResponse<CartResponse>> setGeneralAdmission(
            @PathVariable UUID eventId,
            @PathVariable TicketType ticketType,
            @Valid @RequestBody UpdateCartRequest request) {
        UUID userId = JwtUtils.getCurrentUserId();
        cartService.setGeneralAdmissionQuantity(userId, eventId, ticketType, request.getQuantity());
        return ResponseEntity.ok(ApiResponse.success(currentCart(userId), "Cart updated successfully"));
    }

    @DeleteMapping("/general-admission/{eventId}/{ticketType}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Remove a complete GA cart line")
    public ResponseEntity<ApiResponse<CartResponse>> removeGeneralAdmission(
            @PathVariable UUID eventId, @PathVariable TicketType ticketType) {
        UUID userId = JwtUtils.getCurrentUserId();
        cartService.removeGeneralAdmission(userId, eventId, ticketType);
        return ResponseEntity.ok(ApiResponse.success(currentCart(userId), "Cart line removed successfully"));
    }

    @PostMapping("/seats/{ticketId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Reserve one specific seat")
    public ResponseEntity<ApiResponse<CartResponse>> addSeat(@PathVariable UUID ticketId) {
        UUID userId = JwtUtils.getCurrentUserId();
        cartService.addSeat(userId, ticketId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(currentCart(userId), "Seat reserved successfully"));
    }

    @DeleteMapping("/seats/{ticketId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Release one specific seat")
    public ResponseEntity<ApiResponse<CartResponse>> removeSeat(@PathVariable UUID ticketId) {
        UUID userId = JwtUtils.getCurrentUserId();
        cartService.removeItemFromCart(userId, ticketId);
        return ResponseEntity.ok(ApiResponse.success(currentCart(userId), "Seat released successfully"));
    }

    @PostMapping("/items")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Add items to cart (batch)", description = "Adds multiple tickets to the authenticated user's cart in batch. " +
            "Requires USER, ADMIN, or ORGANIZER role. Each item should specify ticketTypeId (ticket UUID or event UUID) and quantity.")
    public ResponseEntity<ApiResponse<Void>> addItemsToCart(
            @Valid @RequestBody List<CartItemRequest> items) {
        log.debug("Received request to add {} items to cart", items.size());

        // Get current user's UUID from JWT
            UUID userId = JwtUtils.getCurrentUserId();

        // Process each item
        for (CartItemRequest item : items) {
            try {
                // Try to parse as UUID (could be ticket ID or event ID)
                UUID id = UUID.fromString(item.getTicketTypeId());
                
                // Check if it's a valid ticket ID
                if (ticketRepository.existsById(id)) {
                    // It's a ticket ID, add directly
                    cartService.addItemToCart(userId, id, item.getQuantity());
                } else {
                    // Assume it's an event ID - need to find available ticket
                    // For batch operations, we'll use the first available ticket of any type
                    // This is a simplified approach - in production, you might want to specify ticket type
                    throw new ValidationException("Event ID specified but ticket type not provided. " +
                            "For batch operations with event IDs, please use /api/v1/cart/add endpoint.");
                }
            } catch (IllegalArgumentException e) {
                throw new ValidationException("Invalid ticket type ID format: " + item.getTicketTypeId());
            }
        }

        log.info("Successfully added {} items to cart for user: {}", items.size(), userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Items added to cart successfully"));
    }

    @PostMapping("/import")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Atomically import an unreserved guest cart")
    public ResponseEntity<ApiResponse<CartResponse>> importCart(@Valid @RequestBody ImportCartRequest request) {
        UUID userId = JwtUtils.getCurrentUserId();
        List<CartService.ImportLine> lines = request.getItems().stream()
                .map(line -> new CartService.ImportLine(line.getEventId(), line.getTicketType(),
                        line.getTicketId(), line.getQuantity()))
                .toList();
        cartService.importGuestCart(userId, lines);
        return ResponseEntity.ok(ApiResponse.success(currentCart(userId), "Cart imported successfully"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Get user's cart", description = "Retrieves all items in the authenticated user's cart. " +
            "Requires USER, ADMIN, or ORGANIZER role.")
    public ResponseEntity<ApiResponse<CartResponse>> getCart() {
        log.debug("Received request to get user's cart");

        // Get current user's UUID from JWT
        UUID userId = JwtUtils.getCurrentUserId();

        // Get cart items
        CartResponse response = currentCart(userId);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/update/{ticketId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Update cart item quantity", description = "Updates the quantity of a specific item in the cart. " +
            "Requires USER, ADMIN, or ORGANIZER role.")
    public ResponseEntity<ApiResponse<CartResponse>> updateCartItem(
            @PathVariable UUID ticketId,
            @Valid @RequestBody UpdateCartRequest request) {
        log.debug("Received request to update cart item: ticketId={}, quantity={}", ticketId, request.getQuantity());

        // Get current user's UUID from JWT
        UUID userId = JwtUtils.getCurrentUserId();

        // Update cart item
        cartService.updateCartItemQuantity(userId, ticketId, request.getQuantity());

        // Get updated cart
        CartResponse response = currentCart(userId);
        response.setMessage("Cart item updated successfully");

        return ResponseEntity.ok(ApiResponse.success(response, "Cart item updated successfully"));
    }

    @DeleteMapping("/delete/{ticketId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Remove item from cart", description = "Removes a specific item from the authenticated user's cart. " +
            "Requires USER, ADMIN, or ORGANIZER role.")
    public ResponseEntity<ApiResponse<Void>> removeFromCart(@PathVariable UUID ticketId) {
        log.debug("Received request to remove item from cart: ticketId={}", ticketId);

        // Get current user's UUID from JWT
        UUID userId = JwtUtils.getCurrentUserId();

        // Remove from cart
        cartService.removeItemFromCart(userId, ticketId);

        return ResponseEntity.ok(ApiResponse.success(null, "Item removed from cart successfully"));
    }

    @DeleteMapping("/clear")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Clear cart", description = "Removes all items from the authenticated user's cart. " +
            "Requires USER, ADMIN, or ORGANIZER role.")
    public ResponseEntity<ApiResponse<Void>> clearCart() {
        log.debug("Received request to clear cart");

        // Get current user's UUID from JWT
        UUID userId = JwtUtils.getCurrentUserId();

        // Clear cart
        cartService.clearCart(userId);

        return ResponseEntity.ok(ApiResponse.success(null, "Cart cleared successfully"));
    }

    private CartResponse currentCart(UUID userId) {
        List<CartEntity> cartItems = cartService.getUserCart(userId);
        BigDecimal totalCost = cartService.calculateCartTotal(userId);
        return CartResponse.fromCartEntities(cartItems, userId, totalCost);
    }
}
