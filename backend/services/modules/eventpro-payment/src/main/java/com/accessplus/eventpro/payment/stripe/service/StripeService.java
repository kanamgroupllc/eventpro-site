package com.accessplus.eventpro.payment.stripe.service;

import com.accessplus.eventpro.payment.stripe.model.StripeBillingAddress;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Service interface for Stripe payment operations.
 */
public interface StripeService {

    record CreatedPaymentIntent(String id, String clientSecret) {}
    
    /**
     * Creates a Stripe payment intent.
     * 
     * @param amount payment amount in dollars (will be converted to cents)
     * @param currency currency code (default: "usd")
     * @return PaymentIntent client secret
     * @throws StripeException if Stripe API call fails
     */
    String createPaymentIntent(BigDecimal amount, String currency) throws StripeException;

    CreatedPaymentIntent createPaymentIntent(BigDecimal amount, String currency,
                                              Map<String, String> metadata,
                                              String idempotencyKey) throws StripeException;

    /** Retrieves a PaymentIntent without confirming it. */
    PaymentIntent retrievePaymentIntent(String paymentIntentId) throws StripeException;
    
    /**
     * Confirms a payment intent.
     * 
     * @param paymentIntentId Stripe payment intent ID
     * @return confirmed PaymentIntent
     * @throws StripeException if Stripe API call fails
     */
    PaymentIntent confirmPayment(String paymentIntentId) throws StripeException;
    
    /**
     * Refunds a payment.
     * 
     * @param paymentIntentId Stripe payment intent ID
     * @return refund ID
     * @throws StripeException if Stripe API call fails
     */
    String refundPayment(String paymentIntentId) throws StripeException;

    /** Refunds a payment with a stable idempotency key for compensation retries. */
    String refundPayment(String paymentIntentId, String idempotencyKey) throws StripeException;

    /**
     * Retrieves billing address from the PaymentIntent's payment method (card).
     * Stripe validates this with the address on the user's card (AVS). Use for tax jurisdiction and order record.
     *
     * @param paymentIntentId Stripe payment intent ID (must be already confirmed so payment_method is set)
     * @return billing address (state, country) if present, or null if not collected/expanded
     */
    StripeBillingAddress getBillingAddressFromPaymentIntent(String paymentIntentId) throws StripeException;

    /**
     * Creates a Stripe Customer for subscription billing (idempotent: reuse if same email).
     *
     * @param email customer email
     * @param name  optional display name
     * @return Stripe Customer ID
     */
    String createCustomer(String email, String name) throws StripeException;

    /**
     * Creates a Stripe Checkout Session for subscription (Pro/Enterprise).
     * Customer must already exist. Caller should persist customer ID on user before redirecting.
     *
     * @param customerId        Stripe Customer ID
     * @param priceId           Stripe Price ID (e.g. Pro monthly)
     * @param successUrl        URL to redirect after successful payment
     * @param cancelUrl         URL to redirect if user cancels
     * @param clientReferenceId optional (e.g. user ID) for reference
     * @return Checkout Session URL to redirect the user to
     */
    String createSubscriptionCheckoutSession(String customerId, String priceId, String successUrl, String cancelUrl, String clientReferenceId) throws StripeException;

    // --- Stripe Connect (payouts) ---

    /**
     * Creates a Stripe Connect Express account for payouts. Caller should persist the returned account ID on the user.
     *
     * @param email organizer email
     * @param name  optional display name
     * @return Stripe Connect account ID (acct_...)
     */
    String createConnectExpressAccount(String email, String name) throws StripeException;

    /**
     * Creates a one-time AccountLink for Connect onboarding or updating. User is redirected to this URL.
     *
     * @param accountId  Stripe Connect account ID
     * @param returnUrl  URL to redirect after completing onboarding
     * @param refreshUrl URL to redirect if link expires
     * @return URL to redirect the user to
     */
    String createConnectAccountLink(String accountId, String returnUrl, String refreshUrl) throws StripeException;

    /**
     * Transfers funds from the platform to a Connect Express account (payout). Platform must have sufficient balance.
     *
     * @param amountDollars        amount in dollars (converted to cents)
     * @param destinationAccountId Stripe Connect account ID (acct_...)
     * @param currency             e.g. "usd"
     * @return Stripe Transfer ID
     */
    String createTransferToConnectAccount(BigDecimal amountDollars, String destinationAccountId, String currency) throws StripeException;
}
