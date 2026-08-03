package com.accessplus.eventpro.payment.stripe.service.impl;

import com.accessplus.eventpro.payment.stripe.model.StripeBillingAddress;
import com.accessplus.eventpro.payment.stripe.service.StripeService;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Account;
import com.stripe.model.AccountLink;
import com.stripe.model.Customer;
import com.stripe.model.PaymentIntent;
import com.stripe.model.PaymentMethod;
import com.stripe.model.Refund;
import com.stripe.model.Transfer;
import com.stripe.param.AccountCreateParams;
import com.stripe.param.AccountLinkCreateParams;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.PaymentIntentConfirmParams;
import com.stripe.param.PaymentIntentRetrieveParams;
import com.stripe.param.RefundCreateParams;
import com.stripe.param.TransferCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import com.stripe.net.RequestOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.util.Map;

/**
 * Implementation of StripeService using Stripe Java SDK.
 */
@Slf4j
@Service
public class StripeServiceImpl implements StripeService {
    
    @Value("${stripe.secretKey}")
    private String stripeSecretKey;
    
    @PostConstruct
    public void init() {
        String key = stripeSecretKey != null ? stripeSecretKey.trim() : "";
        if (key.isEmpty() || "sk_test_local".equals(key)) {
            log.warn("Stripe secret key is missing or still the placeholder (sk_test_local). Set STRIPE_SECRET_KEY in .env and restart. Payment intents will fail until then.");
        }
        Stripe.apiKey = key;
        log.info("Stripe API key initialized");
    }

    private void ensureStripeConfigured() {
        String key = stripeSecretKey != null ? stripeSecretKey.trim() : "";
        if (key.isEmpty() || "sk_test_local".equals(key)) {
            throw new IllegalStateException(
                "Payment is not configured. Add STRIPE_SECRET_KEY=sk_test_... to a .env file in the project root and restart the backend. Get a key from https://dashboard.stripe.com/test/apikeys");
        }
    }
    
    @Override
    public String createPaymentIntent(BigDecimal amount, String currency) throws StripeException {
        return createPaymentIntent(amount, currency, Map.of(), null).clientSecret();
    }

    @Override
    public CreatedPaymentIntent createPaymentIntent(BigDecimal amount, String currency,
                                                     Map<String, String> metadata,
                                                     String idempotencyKey) throws StripeException {
        ensureStripeConfigured();
        log.debug("Creating payment intent: amount={}, currency={}", amount, currency);
        
        // Convert amount to cents (Stripe uses smallest currency unit)
        long amountInCents = amount.multiply(BigDecimal.valueOf(100)).longValue();
        
        PaymentIntentCreateParams.Builder builder = PaymentIntentCreateParams.builder()
                .setAmount(amountInCents)
                .setCurrency(currency != null ? currency : "usd")
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .setAllowRedirects(PaymentIntentCreateParams.AutomaticPaymentMethods.AllowRedirects.NEVER)
                                .build()
                );
        if (metadata != null) metadata.forEach(builder::putMetadata);
        RequestOptions options = idempotencyKey == null || idempotencyKey.isBlank()
                ? null
                : RequestOptions.builder().setIdempotencyKey(idempotencyKey).build();
        PaymentIntent paymentIntent = PaymentIntent.create(builder.build(), options);
        log.info("Payment intent created: id={}", paymentIntent.getId());
        return new CreatedPaymentIntent(paymentIntent.getId(), paymentIntent.getClientSecret());
    }

    @Override
    public PaymentIntent retrievePaymentIntent(String paymentIntentId) throws StripeException {
        ensureStripeConfigured();
        return PaymentIntent.retrieve(paymentIntentId);
    }
    
    @Override
    public PaymentIntent confirmPayment(String paymentIntentId) throws StripeException {
        ensureStripeConfigured();
        log.debug("Confirming payment intent: id={}", paymentIntentId);
        
        PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);
        
        // If not already confirmed, confirm it
        if (!"succeeded".equals(paymentIntent.getStatus())) {
            PaymentIntentConfirmParams params = PaymentIntentConfirmParams.builder().build();
            paymentIntent = paymentIntent.confirm(params);
        }
        
        log.info("Payment intent confirmed: id={}, status={}", 
                paymentIntent.getId(), paymentIntent.getStatus());
        
        return paymentIntent;
    }
    
    @Override
    public String refundPayment(String paymentIntentId) throws StripeException {
        return refundPayment(paymentIntentId, null);
    }

    @Override
    public String refundPayment(String paymentIntentId, String idempotencyKey) throws StripeException {
        ensureStripeConfigured();
        log.debug("Refunding payment intent: id={}", paymentIntentId);
        
        PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);
        
        // Get the latest charge ID from the payment intent
        // In newer Stripe API, we need to expand charges or use the latest charge
        String chargeId = paymentIntent.getLatestCharge();
        
        if (chargeId == null || chargeId.isEmpty()) {
            throw new RuntimeException("No charge found for payment intent: " + paymentIntentId);
        }
        
        RefundCreateParams params = RefundCreateParams.builder()
                .setPaymentIntent(paymentIntentId)
                .build();
        
        RequestOptions options = idempotencyKey == null || idempotencyKey.isBlank()
                ? null : RequestOptions.builder().setIdempotencyKey(idempotencyKey).build();
        Refund refund = Refund.create(params, options);
        log.info("Payment refunded: paymentIntentId={}, refundId={}", 
                paymentIntentId, refund.getId());
        
        return refund.getId();
    }

    @Override
    public StripeBillingAddress getBillingAddressFromPaymentIntent(String paymentIntentId) throws StripeException {
        ensureStripeConfigured();
        PaymentIntentRetrieveParams params = PaymentIntentRetrieveParams.builder()
                .addExpand("payment_method")
                .build();
        PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId, params, null);
        Object pmObj = paymentIntent.getPaymentMethod();
        if (pmObj == null) {
            return null;
        }
        PaymentMethod pm;
        if (pmObj instanceof PaymentMethod) {
            pm = (PaymentMethod) pmObj;
        } else if (pmObj instanceof com.stripe.model.ExpandableField) {
            @SuppressWarnings("unchecked")
            com.stripe.model.ExpandableField<PaymentMethod> field = (com.stripe.model.ExpandableField<PaymentMethod>) pmObj;
            if (!field.isExpanded()) {
                return null;
            }
            pm = field.getExpanded();
        } else {
            return null;
        }
        if (pm == null || pm.getBillingDetails() == null || pm.getBillingDetails().getAddress() == null) {
            return null;
        }
        com.stripe.model.Address addr = pm.getBillingDetails().getAddress();
        String state = addr.getState() != null && !addr.getState().isBlank() ? addr.getState().trim() : null;
        String country = addr.getCountry() != null && !addr.getCountry().isBlank() ? addr.getCountry().trim() : null;
        if (state == null && country == null) {
            return null;
        }
        return new StripeBillingAddress(state, country);
    }

    @Override
    public String createCustomer(String email, String name) throws StripeException {
        ensureStripeConfigured();
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required for Stripe Customer");
        }
        CustomerCreateParams params = CustomerCreateParams.builder()
                .setEmail(email.trim().toLowerCase())
                .setName(name != null && !name.isBlank() ? name.trim() : null)
                .build();
        Customer customer = Customer.create(params);
        log.info("Created Stripe customer: id={}, email={}", customer.getId(), email);
        return customer.getId();
    }

    @Override
    public String createSubscriptionCheckoutSession(String customerId, String priceId, String successUrl, String cancelUrl, String clientReferenceId) throws StripeException {
        ensureStripeConfigured();
        if (customerId == null || customerId.isBlank() || priceId == null || priceId.isBlank()) {
            throw new IllegalArgumentException("customerId and priceId are required");
        }
        SessionCreateParams.LineItem lineItem = SessionCreateParams.LineItem.builder()
                .setPrice(priceId)
                .setQuantity(1L)
                .build();
        SessionCreateParams.Builder paramsBuilder = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .setCustomer(customerId)
                .addLineItem(lineItem)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl);
        if (clientReferenceId != null && !clientReferenceId.isBlank()) {
            paramsBuilder.setClientReferenceId(clientReferenceId);
        }
        com.stripe.model.checkout.Session session = com.stripe.model.checkout.Session.create(paramsBuilder.build());
        String url = session.getUrl();
        log.info("Created subscription checkout session: id={}, url={}", session.getId(), url != null ? "present" : "null");
        return url;
    }

    @Override
    public String createConnectExpressAccount(String email, String name) throws StripeException {
        ensureStripeConfigured();
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required for Connect account");
        }
        AccountCreateParams params = AccountCreateParams.builder()
                .setType(AccountCreateParams.Type.EXPRESS)
                .setEmail(email.trim().toLowerCase())
                .build();
        Account account = Account.create(params);
        log.info("Created Stripe Connect Express account: id={}, email={}", account.getId(), email);
        return account.getId();
    }

    @Override
    public String createConnectAccountLink(String accountId, String returnUrl, String refreshUrl) throws StripeException {
        ensureStripeConfigured();
        if (accountId == null || accountId.isBlank() || returnUrl == null || refreshUrl == null) {
            throw new IllegalArgumentException("accountId, returnUrl, and refreshUrl are required");
        }
        AccountLinkCreateParams params = AccountLinkCreateParams.builder()
                .setAccount(accountId)
                .setRefreshUrl(refreshUrl)
                .setReturnUrl(returnUrl)
                .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
                .build();
        AccountLink link = AccountLink.create(params);
        String url = link.getUrl();
        log.info("Created Connect AccountLink for account: {}", accountId);
        return url;
    }

    @Override
    public String createTransferToConnectAccount(BigDecimal amountDollars, String destinationAccountId, String currency) throws StripeException {
        ensureStripeConfigured();
        if (amountDollars == null || amountDollars.compareTo(BigDecimal.ZERO) <= 0 || destinationAccountId == null || destinationAccountId.isBlank()) {
            throw new IllegalArgumentException("amount (positive), destinationAccountId required");
        }
        long amountCents = amountDollars.multiply(BigDecimal.valueOf(100)).longValue();
        TransferCreateParams params = TransferCreateParams.builder()
                .setAmount(amountCents)
                .setCurrency(currency != null && !currency.isBlank() ? currency.toLowerCase() : "usd")
                .setDestination(destinationAccountId)
                .build();
        Transfer transfer = Transfer.create(params);
        log.info("Created Transfer to Connect account: transferId={}, destination={}, amount={}", transfer.getId(), destinationAccountId, amountDollars);
        return transfer.getId();
    }
}
