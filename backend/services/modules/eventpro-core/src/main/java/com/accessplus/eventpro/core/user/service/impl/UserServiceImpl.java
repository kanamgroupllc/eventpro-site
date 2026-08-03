package com.accessplus.eventpro.core.user.service.impl;

import com.accessplus.eventpro.shared.exception.ConflictException;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.core.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    @Override
    public UserEntity createUser(String email, String passwordHash, String firstName,
                                 String lastName, String phoneNumber, String role) {
        log.debug("Creating user: email={}, role={}", email, role);

        // Check if user already exists by email
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            log.warn("User with email '{}' already exists", email);
            throw new ConflictException("User", "email", email);
        }

        // Create new user entity
        UserEntity user = new UserEntity();
        user.setEmail(email);
        user.setPasswordHash(passwordHash);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setPhoneNumber(phoneNumber);
        user.setStatus("ACTIVE"); // Set default status (database has NOT NULL constraint with DEFAULT 'ACTIVE')
        // Set role, default to USER if not provided
        user.setRole(role != null && !role.isEmpty() ? role : "USER");

        UserEntity savedUser = userRepository.save(user);
        log.info("Created user: id={}, email={}, role={}",
                savedUser.getId(), savedUser.getEmail(), savedUser.getRole());

        return savedUser;
    }

    @Override
    @Transactional(readOnly = true)
    public UserEntity getUserByEmail(String email) {
        log.debug("Retrieving user by email: {}", email);

        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> {
                    log.warn("User not found with email: {}", email);
                    return new ResourceNotFoundException("User", email);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public UserEntity getUserById(UUID userId) {
        log.debug("Retrieving user by ID: {}", userId);

        return userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("User not found with ID: {}", userId);
                    return new ResourceNotFoundException("User", userId.toString());
                });
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserEntity> getAllUsers(Pageable pageable) {
        log.debug("Retrieving all users with pagination: {}", pageable);
        return userRepository.findAll(pageable);
    }

    @Override
    public UserEntity updateUserProfile(UUID userId, String firstName, String lastName, String phoneNumber) {
        log.debug("Updating user profile: userId={}", userId);

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("User not found with ID: {}", userId);
                    return new ResourceNotFoundException("User", userId.toString());
                });

        return updateUserFields(user, firstName, lastName, phoneNumber, null, null, null, null, null, null, null);
    }

    @Override
    public UserEntity updateUserProfile(UUID userId, String firstName, String lastName, String phoneNumber,
                                        String bio, String location, String profilePictureUrl) {
        return updateUserProfile(userId, firstName, lastName, phoneNumber, bio, location, profilePictureUrl, null);
    }

    @Override
    public UserEntity updateUserProfile(UUID userId, String firstName, String lastName, String phoneNumber,
                                        String bio, String location, String profilePictureUrl, String culturalNiche) {
        return updateUserProfile(userId, firstName, lastName, phoneNumber, bio, location, profilePictureUrl, culturalNiche, null, null, null);
    }

    @Override
    public UserEntity updateUserProfile(UUID userId, String firstName, String lastName, String phoneNumber,
                                        String bio, String location, String profilePictureUrl, String culturalNiche,
                                        String brandingLogoUrl, String brandingPrimaryColor, Boolean brandingHidePlatform) {
        log.debug("Updating user profile with extended fields: userId={}", userId);
        UserEntity user = getUserById(userId);
        return updateUserFields(user, firstName, lastName, phoneNumber, bio, location, profilePictureUrl, culturalNiche,
                brandingLogoUrl, brandingPrimaryColor, brandingHidePlatform);
    }

    /**
     * Updates user fields if provided (non-null values).
     *
     * @param user User entity to update
     * @param firstName New first name (optional, null to skip)
     * @param lastName New last name (optional, null to skip)
     * @param phoneNumber New phone number (optional, null to skip)
     * @param bio New bio (optional, null to skip)
     * @param location New location (optional, null to skip)
     * @param profilePictureUrl New profile picture URL (optional, null to skip)
     * @param culturalNiche New cultural niche (optional, null to skip)
     * @return Updated UserEntity
     */
    private UserEntity updateUserFields(UserEntity user, String firstName, String lastName, String phoneNumber,
                                       String bio, String location, String profilePictureUrl, String culturalNiche,
                                       String brandingLogoUrl, String brandingPrimaryColor, Boolean brandingHidePlatform) {
        boolean updated = false;

        if (firstName != null && !firstName.equals(user.getFirstName())) {
            user.setFirstName(firstName);
            updated = true;
            log.debug("Updated firstName for user: {}", user.getId());
        }

        if (lastName != null && !lastName.equals(user.getLastName())) {
            user.setLastName(lastName);
            updated = true;
            log.debug("Updated lastName for user: {}", user.getId());
        }

        if (phoneNumber != null && !phoneNumber.equals(user.getPhoneNumber())) {
            user.setPhoneNumber(phoneNumber);
            updated = true;
            log.debug("Updated phoneNumber for user: {}", user.getId());
        }

        if (bio != null && !bio.equals(user.getBio())) {
            user.setBio(bio);
            updated = true;
            log.debug("Updated bio for user: {}", user.getId());
        }

        if (location != null && !location.equals(user.getLocation())) {
            user.setLocation(location);
            updated = true;
            log.debug("Updated location for user: {}", user.getId());
        }

        if (profilePictureUrl != null && !profilePictureUrl.equals(user.getProfilePictureUrl())) {
            user.setProfilePictureUrl(profilePictureUrl);
            updated = true;
            log.debug("Updated profilePictureUrl for user: {}", user.getId());
        }

        if (culturalNiche != null && !culturalNiche.equals(user.getCulturalNiche())) {
            user.setCulturalNiche(culturalNiche);
            updated = true;
            log.debug("Updated culturalNiche for user: {}", user.getId());
        }
        if (brandingLogoUrl != null && !brandingLogoUrl.equals(user.getBrandingLogoUrl())) {
            user.setBrandingLogoUrl(brandingLogoUrl.isEmpty() ? null : brandingLogoUrl);
            updated = true;
        }
        if (brandingPrimaryColor != null && !brandingPrimaryColor.equals(user.getBrandingPrimaryColor())) {
            user.setBrandingPrimaryColor(brandingPrimaryColor.isEmpty() ? null : brandingPrimaryColor);
            updated = true;
        }
        if (brandingHidePlatform != null && !brandingHidePlatform.equals(user.getBrandingHidePlatform())) {
            user.setBrandingHidePlatform(brandingHidePlatform);
            updated = true;
        }

        if (updated) {
            UserEntity savedUser = userRepository.save(user);
            log.info("Updated user profile: id={}, email={}", savedUser.getId(), savedUser.getEmail());
            return savedUser;
        } else {
            log.debug("No changes to update for user: {}", user.getId());
            return user;
        }
    }

    @Override
    public UserEntity updateUserStatus(UUID userId, String status) {
        log.debug("Updating user status: userId={}, status={}", userId, status);

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));

        user.setStatus(status);
        UserEntity savedUser = userRepository.save(user);
        log.info("Updated user status: id={}, status={}", savedUser.getId(), savedUser.getStatus());

        return savedUser;
    }

    @Override
    public UserEntity updateUserRole(UUID userId, String role) {
        log.debug("Updating user role: userId={}, role={}", userId, role);

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));

        user.setRole(role);
        UserEntity savedUser = userRepository.save(user);
        log.info("Updated user role: id={}, role={}", savedUser.getId(), savedUser.getRole());

        return savedUser;
    }

    @Override
    public UserEntity updateSubscriptionTier(UUID userId, String tier) {
        log.debug("Updating subscription tier: userId={}, tier={}", userId, tier);
        if (tier == null || tier.isBlank()) {
            throw new IllegalArgumentException("Tier is required");
        }
        String normalizedTier = tier.trim().toUpperCase();
        if (!"PRO".equals(normalizedTier) && !"ENTERPRISE".equals(normalizedTier)) {
            throw new IllegalArgumentException("Tier must be PRO or ENTERPRISE");
        }
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));
        String current = user.getSubscriptionTier() != null ? user.getSubscriptionTier().toUpperCase() : "BASIC";
        int currentOrder = "ENTERPRISE".equals(current) ? 2 : "PRO".equals(current) ? 1 : 0;
        int requestedOrder = "ENTERPRISE".equals(normalizedTier) ? 2 : 1;
        if (requestedOrder <= currentOrder) {
            throw new IllegalArgumentException("Cannot downgrade or set same tier. Current: " + current + ", requested: " + normalizedTier);
        }
        user.setSubscriptionTier(normalizedTier);
        UserEntity saved = userRepository.save(user);
        log.info("Updated subscription tier: id={}, tier={}", saved.getId(), saved.getSubscriptionTier());
        return saved;
    }

    @Override
    public UserEntity updateStripeCustomerId(UUID userId, String stripeCustomerId) {
        log.debug("Updating Stripe customer id: userId={}", userId);
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));
        user.setStripeCustomerId(stripeCustomerId);
        return userRepository.save(user);
    }

    @Override
    public UserEntity getUserByStripeCustomerId(String stripeCustomerId) {
        if (stripeCustomerId == null || stripeCustomerId.isBlank()) {
            throw new ResourceNotFoundException("User", "stripeCustomerId");
        }
        return userRepository.findByStripeCustomerId(stripeCustomerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "stripeCustomerId=" + stripeCustomerId));
    }

    @Override
    public UserEntity setSubscriptionTier(UUID userId, String tier) {
        log.debug("Setting subscription tier (billing): userId={}, tier={}", userId, tier);
        String normalized = (tier != null && !tier.isBlank()) ? tier.trim().toUpperCase() : "BASIC";
        if (!"BASIC".equals(normalized) && !"PRO".equals(normalized) && !"ENTERPRISE".equals(normalized)) {
            normalized = "BASIC";
        }
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));
        user.setSubscriptionTier(normalized);
        UserEntity saved = userRepository.save(user);
        log.info("Set subscription tier: id={}, tier={}", saved.getId(), saved.getSubscriptionTier());
        return saved;
    }

    @Override
    public UserEntity setSubscriptionTierAndOrganizerRole(UUID userId, String tier) {
        UserEntity user = setSubscriptionTier(userId, tier);
        if (user == null) return null;
        String normalizedTier = user.getSubscriptionTier();
        if (!"PRO".equals(normalizedTier) && !"ENTERPRISE".equals(normalizedTier)) return user;
        if ("ADMIN".equalsIgnoreCase(user.getRole()) || "ORGANIZER".equalsIgnoreCase(user.getRole())) return user;
        return updateUserRole(userId, "ORGANIZER");
    }
}
