package com.accessplus.eventpro.api.service;

import com.accessplus.eventpro.api.dto.PendingVerificationResponse;
import com.accessplus.eventpro.api.dto.SubmitVerificationRequest;
import com.accessplus.eventpro.api.dto.VerificationStatusResponse;

import java.util.List;
import java.util.UUID;

public interface VerificationService {

    VerificationStatusResponse getStatus(UUID organizerId);

    void submitVerification(UUID organizerId, SubmitVerificationRequest request);

    /** Admin: approve a PENDING KYC submission; sets user verified. */
    void approveSubmission(UUID submissionId);

    /** Admin: reject a PENDING KYC submission; sets user rejected and stores reason. */
    void rejectSubmission(UUID submissionId, String reason);

    /** List PENDING KYC submissions for admin review. */
    List<PendingVerificationResponse> listPendingSubmissions(int limit);
}
