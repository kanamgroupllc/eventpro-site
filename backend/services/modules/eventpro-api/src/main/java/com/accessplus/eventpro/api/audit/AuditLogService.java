package com.accessplus.eventpro.api.audit;

import com.accessplus.eventpro.api.dto.AuditActivityPageResponse;

import java.util.UUID;

/**
 * Append-only audit trail for admin. Writes use REQUIRES_NEW so failures never roll back business transactions.
 */
public interface AuditLogService {

    AuditActivityPageResponse queryPage(int page, int size, String category, String search);

    /**
     * Records an admin-originated action (KYC decision, manual payment, etc.).
     */
    void recordAdminAction(
            UUID actorUserId,
            String action,
            String entityType,
            String entityId,
            String category,
            String statusLabel,
            String statusTone,
            String summary);

    /**
     * Records a finance-critical system or user action (orders, payments, wallet).
     */
    default void recordFinanceEvent(UUID actorUserId, String action, String entityType, String entityId, String summary) {
        recordAdminAction(actorUserId, action, entityType, entityId, "finance", "completed", "success", summary);
    }
}
