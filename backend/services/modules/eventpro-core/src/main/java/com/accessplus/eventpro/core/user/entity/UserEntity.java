package com.accessplus.eventpro.core.user.entity;

import com.accessplus.eventpro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_user_email", columnList = "email")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserEntity extends BaseEntity {

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "profile_picture_url", length = 500)
    private String profilePictureUrl;

    @Column(name = "status", length = 50)
    private String status;

    @Column(name = "role", length = 50)
    private String role;

    /** Subscription/plan tier: BASIC, PRO, ENTERPRISE. Gates features per pricing page. */
    @Column(name = "subscription_tier", length = 20, nullable = false)
    private String subscriptionTier = "BASIC";

    /** Stripe Customer ID for subscription billing; set when user starts subscription checkout. */
    @Column(name = "stripe_customer_id", length = 255)
    private String stripeCustomerId;

    /** Stripe Connect Express account ID for payouts; set after completing Connect onboarding. */
    @Column(name = "stripe_connect_account_id", length = 255)
    private String stripeConnectAccountId;

    /** True when tax/ID provided and risk check passed; gates early/instant payouts. */
    @Column(name = "is_verified", nullable = false)
    private Boolean isVerified = false;

    /** KYC workflow: NOT_STARTED, PENDING, IN_PROGRESS, VERIFIED, REJECTED. */
    @Column(name = "verification_status", length = 30, nullable = false)
    private String verificationStatus = "NOT_STARTED";

    /** Risk level for payouts/limits: LOW, MEDIUM, HIGH. */
    @Column(name = "risk_level", length = 20, nullable = false)
    private String riskLevel = "LOW";

    /** Organizer focus e.g. West African Cultural Events; feeds cultural taxonomy search. */
    @Column(name = "cultural_niche", length = 255)
    private String culturalNiche;

    /** True when W-9 (TIN) submitted for 1099-K; required once gross payments approach $600. */
    @Column(name = "w9_submitted", nullable = false)
    private Boolean w9Submitted = false;

    /** White-label: custom logo URL for event pages and emails (Pro/Enterprise). */
    @Column(name = "branding_logo_url", length = 500)
    private String brandingLogoUrl;

    /** White-label: primary brand color hex e.g. #1a1a2e (Pro/Enterprise). */
    @Column(name = "branding_primary_color", length = 20)
    private String brandingPrimaryColor;

    /** White-label: when true, hide platform name on event pages (Pro/Enterprise). */
    @Column(name = "branding_hide_platform", nullable = false)
    private Boolean brandingHidePlatform = false;

    // Relationships will be added in future phases when related entities are created
    // For now, we'll use lazy initialization to avoid circular dependencies
    
    /**
     * Events created by this user (as organizer).
     * 
     * NOTE: This relationship is commented out to avoid circular dependency.
     * The eventpro-core module does not depend on eventpro-event module.
     * To get events for a user, use EventRepository.findByOrganizerId(userId) instead.
     */
    // @OneToMany(mappedBy = "organizer", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    // private List<EventEntity> events = new ArrayList<>();

    /**
     * Orders placed by this user.
     * To be implemented when OrderEntity is created.
     */
    // @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    // private List<OrderEntity> orders = new ArrayList<>();

    /**
     * Cart items for this user.
     * To be implemented when CartEntity is created.
     */
    // @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    // private List<CartEntity> cartItems = new ArrayList<>();

    /**
     * User notifications.
     * To be implemented when UserNotificationEntity is created.
     */
    // @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    // private List<UserNotificationEntity> userNotifications = new ArrayList<>();

    /**
     * Notification preferences for this user.
     * To be implemented when NotificationPreferenceEntity is created.
     */
    // @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    // private NotificationPreferenceEntity notificationPreference;
}
