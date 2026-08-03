package com.accessplus.eventpro.api.service.impl;

import com.accessplus.eventpro.api.audit.AuditLogService;
import com.accessplus.eventpro.api.dto.PendingVerificationResponse;
import com.accessplus.eventpro.api.dto.SubmitVerificationRequest;
import com.accessplus.eventpro.api.dto.VerificationStatusResponse;
import com.accessplus.eventpro.api.service.RiskScoringService;
import com.accessplus.eventpro.api.service.VerificationService;
import com.accessplus.eventpro.core.security.JwtUtils;
import com.accessplus.eventpro.core.user.entity.OrganizerKycSubmissionEntity;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.OrganizerKycSubmissionRepository;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class VerificationServiceImpl implements VerificationService {

    private final UserRepository userRepository;
    private final OrganizerKycSubmissionRepository kycSubmissionRepository;
    private final RiskScoringService riskScoringService;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public VerificationStatusResponse getStatus(UUID organizerId) {
        UserEntity user = userRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", organizerId.toString()));
        String status = user.getVerificationStatus() != null ? user.getVerificationStatus() : "NOT_STARTED";
        String riskLevel = user.getRiskLevel() != null ? user.getRiskLevel() : "LOW";
        boolean canResubmit = "REJECTED".equals(status);
        Instant lastSubmittedAt = null;
        String lastRejectionReason = null;
        List<OrganizerKycSubmissionEntity> submissions = kycSubmissionRepository
                .findByUserIdOrderBySubmittedAtDesc(organizerId, PageRequest.of(0, 10));
        if (!submissions.isEmpty()) {
            lastSubmittedAt = submissions.get(0).getSubmittedAt();
            lastRejectionReason = submissions.stream()
                    .filter(s -> "REJECTED".equals(s.getStatus()))
                    .findFirst()
                    .map(OrganizerKycSubmissionEntity::getRejectionReason)
                    .orElse(null);
        }
        return VerificationStatusResponse.builder()
                .verificationStatus(status)
                .riskLevel(riskLevel)
                .canResubmit(canResubmit)
                .lastSubmittedAt(lastSubmittedAt)
                .lastRejectionReason(lastRejectionReason)
                .build();
    }

    @Override
    @Transactional
    public void submitVerification(UUID organizerId, SubmitVerificationRequest request) {
        UserEntity user = userRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", organizerId.toString()));
        String current = user.getVerificationStatus() != null ? user.getVerificationStatus() : "NOT_STARTED";
        if ("PENDING".equals(current) || "IN_PROGRESS".equals(current)) {
            throw new IllegalStateException("Verification already in progress. Wait for review.");
        }
        if ("VERIFIED".equals(current)) {
            throw new IllegalStateException("Already verified.");
        }
        if ("INDIVIDUAL".equals(request.getLegalEntityType()) && (request.getSsnLast4() == null || !request.getSsnLast4().matches("\\d{4}"))) {
            throw new ValidationException("SSN last 4 digits are required for individuals (1099-K reporting).");
        }
        if ("BUSINESS".equals(request.getLegalEntityType()) && (request.getEin() == null || request.getEin().trim().isEmpty())) {
            throw new ValidationException("EIN is required for businesses.");
        }

        OrganizerKycSubmissionEntity submission = new OrganizerKycSubmissionEntity();
        submission.setUserId(organizerId);
        submission.setLegalEntityType(request.getLegalEntityType());
        submission.setSsnLast4("INDIVIDUAL".equals(request.getLegalEntityType()) ? request.getSsnLast4() : null);
        submission.setEin("BUSINESS".equals(request.getLegalEntityType()) ? request.getEin() : null);
        submission.setAddressStreet(request.getAddressStreet());
        submission.setAddressCity(request.getAddressCity());
        submission.setAddressState(request.getAddressState());
        submission.setAddressZip(request.getAddressZip());
        submission.setIdProvider(request.getIdProvider() != null ? request.getIdProvider() : "STRIPE_IDENTITY");
        submission.setIdSessionId(request.getIdSessionId());
        submission.setStatus("PENDING");
        submission.setSubmittedAt(Instant.now());
        kycSubmissionRepository.save(submission);

        user.setVerificationStatus("IN_PROGRESS");
        userRepository.save(user);
        riskScoringService.computeAndUpdateRiskScore(organizerId);
        log.info("KYC submitted for organizer: {} (IN_PROGRESS until admin review or automated OFAC/ID check)", organizerId);
        // When OFAC and ID verification (Stripe Identity/Persona) are integrated: run checks async,
        // then call approveSubmission(submission.getId()) or rejectSubmission(submission.getId(), reason).
    }

    @Override
    @Transactional
    public void approveSubmission(UUID submissionId) {
        OrganizerKycSubmissionEntity submission = kycSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("KYC submission", submissionId.toString()));
        if (!"PENDING".equals(submission.getStatus())) {
            throw new ValidationException("Only PENDING submissions can be approved. Current status: " + submission.getStatus());
        }
        submission.setStatus("VERIFIED");
        submission.setReviewedAt(Instant.now());
        kycSubmissionRepository.save(submission);

        UserEntity user = userRepository.findById(submission.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", submission.getUserId().toString()));
        user.setVerificationStatus("VERIFIED");
        user.setIsVerified(true);
        userRepository.save(user);
        log.info("KYC approved: submissionId={}, userId={}", submissionId, submission.getUserId());
        recordKycDecisionAudit("KYC submission approved", submissionId, submission.getUserId(), "VERIFIED", "success");
    }

    @Override
    @Transactional
    public void rejectSubmission(UUID submissionId, String reason) {
        OrganizerKycSubmissionEntity submission = kycSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("KYC submission", submissionId.toString()));
        if (!"PENDING".equals(submission.getStatus())) {
            throw new ValidationException("Only PENDING submissions can be rejected. Current status: " + submission.getStatus());
        }
        submission.setStatus("REJECTED");
        submission.setReviewedAt(Instant.now());
        submission.setRejectionReason(reason != null ? reason.trim() : null);
        kycSubmissionRepository.save(submission);

        UserEntity user = userRepository.findById(submission.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", submission.getUserId().toString()));
        user.setVerificationStatus("REJECTED");
        user.setIsVerified(false);
        userRepository.save(user);
        log.info("KYC rejected: submissionId={}, userId={}, reason={}", submissionId, submission.getUserId(), reason);
        recordKycDecisionAudit("KYC submission rejected", submissionId, submission.getUserId(), "REJECTED", "warning");
    }

    private void recordKycDecisionAudit(
            String action, UUID submissionId, UUID subjectUserId, String statusLabel, String statusTone) {
        try {
            UUID actor = JwtUtils.getCurrentUserId();
            auditLogService.recordAdminAction(
                    actor,
                    action,
                    "KYC_SUBMISSION",
                    submissionId.toString(),
                    "security",
                    statusLabel,
                    statusTone,
                    "Submission " + submissionId + "; organizer " + subjectUserId);
        } catch (Exception ex) {
            log.warn("Failed to record KYC audit event for submission {}", submissionId, ex);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<PendingVerificationResponse> listPendingSubmissions(int limit) {
        List<OrganizerKycSubmissionEntity> list = kycSubmissionRepository
                .findByStatusOrderBySubmittedAtDesc("PENDING", org.springframework.data.domain.PageRequest.of(0, limit > 0 ? limit : 50));
        List<PendingVerificationResponse> result = new ArrayList<>();
        for (OrganizerKycSubmissionEntity s : list) {
            UserEntity u = userRepository.findById(s.getUserId()).orElse(null);
            result.add(PendingVerificationResponse.builder()
                    .id(s.getId())
                    .userId(s.getUserId())
                    .email(u != null ? u.getEmail() : null)
                    .legalEntityType(s.getLegalEntityType())
                    .addressCity(s.getAddressCity())
                    .addressState(s.getAddressState())
                    .submittedAt(s.getSubmittedAt())
                    .status(s.getStatus())
                    .build());
        }
        return result;
    }
}
