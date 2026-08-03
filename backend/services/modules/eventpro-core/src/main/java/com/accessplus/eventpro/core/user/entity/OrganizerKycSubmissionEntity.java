package com.accessplus.eventpro.core.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * KYC submission for organizer verification (legal entity, address, ID document).
 * Status: PENDING (submitted), IN_PROGRESS (risk check), VERIFIED, REJECTED.
 */
@Entity
@Table(name = "organizer_kyc_submissions", indexes = {
    @Index(name = "idx_kyc_user_id", columnList = "user_id"),
    @Index(name = "idx_kyc_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OrganizerKycSubmissionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "legal_entity_type", nullable = false, length = 20)
    private String legalEntityType; // INDIVIDUAL, BUSINESS

    @Column(name = "ssn_last4", length = 4)
    private String ssnLast4;

    @Column(name = "ein", length = 20)
    private String ein;

    @Column(name = "address_street", nullable = false, length = 255)
    private String addressStreet;

    @Column(name = "address_city", nullable = false, length = 100)
    private String addressCity;

    @Column(name = "address_state", nullable = false, length = 50)
    private String addressState;

    @Column(name = "address_zip", nullable = false, length = 20)
    private String addressZip;

    @Column(name = "id_provider", length = 50)
    private String idProvider; // STRIPE_IDENTITY, PERSONA

    @Column(name = "id_session_id", length = 255)
    private String idSessionId;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "PENDING";

    @CreationTimestamp
    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }
}
