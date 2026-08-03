package com.accessplus.eventpro.core.user.service;

import com.accessplus.eventpro.core.user.entity.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface UserService {

    UserEntity createUser(String email, String passwordHash, String firstName,
                          String lastName, String phoneNumber, String role);

    UserEntity getUserByEmail(String email);

    UserEntity getUserById(UUID userId);

    Page<UserEntity> getAllUsers(Pageable pageable);

    UserEntity updateUserProfile(UUID userId, String firstName, String lastName, String phoneNumber);

    UserEntity updateUserProfile(UUID userId, String firstName, String lastName, String phoneNumber,
                                 String bio, String location, String profilePictureUrl);

    UserEntity updateUserProfile(UUID userId, String firstName, String lastName, String phoneNumber,
                                 String bio, String location, String profilePictureUrl, String culturalNiche);

    /** Same as above plus white-label branding fields (Pro/Enterprise). */
    UserEntity updateUserProfile(UUID userId, String firstName, String lastName, String phoneNumber,
                                 String bio, String location, String profilePictureUrl, String culturalNiche,
                                 String brandingLogoUrl, String brandingPrimaryColor, Boolean brandingHidePlatform);

    UserEntity updateUserStatus(UUID userId, String status);

    UserEntity updateUserRole(UUID userId, String role);

    /**
     * Updates the user's subscription tier (e.g. for upgrade flow).
     * Valid tiers: PRO, ENTERPRISE. Only allows upgrading (BASIC -> PRO -> ENTERPRISE).
     */
    UserEntity updateSubscriptionTier(UUID userId, String tier);

    /** Sets Stripe Customer ID for subscription billing (idempotent). */
    UserEntity updateStripeCustomerId(UUID userId, String stripeCustomerId);

    /** Gets user by Stripe Customer ID (for webhooks). */
    UserEntity getUserByStripeCustomerId(String stripeCustomerId);

    /** Sets subscription tier without upgrade check (for Stripe webhooks: renewals, cancellations). */
    UserEntity setSubscriptionTier(UUID userId, String tier);

    /**
     * Sets subscription tier and, when tier is PRO or ENTERPRISE, sets role to ORGANIZER (unless user is ADMIN).
     * Use after Stripe confirms payment or when syncing from Stripe.
     */
    UserEntity setSubscriptionTierAndOrganizerRole(UUID userId, String tier);
}
