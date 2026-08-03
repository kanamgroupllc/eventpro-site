package com.accessplus.eventpro.api.audit.impl;

import com.accessplus.eventpro.api.audit.AuditLogService;
import com.accessplus.eventpro.api.audit.entity.PlatformAuditEventEntity;
import com.accessplus.eventpro.api.audit.repository.PlatformAuditEventRepository;
import com.accessplus.eventpro.api.dto.AuditActivityPageResponse;
import com.accessplus.eventpro.api.dto.AuditActivityResponse;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_SUMMARY = 4000;
    private static final int MAX_LABEL = 255;
    private static final Set<String> ALLOWED_CATEGORIES = Set.of("finance", "users", "events", "security", "system");

    private final PlatformAuditEventRepository repository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public AuditActivityPageResponse queryPage(int page, int size, String category, String search) {
        int pageSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int pageIndex = Math.max(page - 1, 0);
        Pageable p = PageRequest.of(pageIndex, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        String cat = category != null && !category.isBlank() && !"all".equalsIgnoreCase(category) ? category.trim() : null;
        if (cat != null && !ALLOWED_CATEGORIES.contains(cat)) {
            cat = null;
        }
        String q = search != null && !search.isBlank() ? search.trim() : null;
        if (q != null && q.length() > 200) {
            q = q.substring(0, 200);
        }
        Page<PlatformAuditEventEntity> result = repository.findFiltered(cat, q, p);
        return AuditActivityPageResponse.builder()
                .content(result.getContent().stream().map(this::toResponse).toList())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .page(pageIndex + 1)
                .size(pageSize)
                .build();
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordAdminAction(
            UUID actorUserId,
            String action,
            String entityType,
            String entityId,
            String category,
            String statusLabel,
            String statusTone,
            String summary) {
        if (category == null || !ALLOWED_CATEGORIES.contains(category)) {
            log.warn("Invalid audit category {}, defaulting to system", category);
            category = "system";
        }
        String label = resolveActorLabel(actorUserId);
        PlatformAuditEventEntity e = new PlatformAuditEventEntity();
        e.setId(UUID.randomUUID());
        e.setCreatedAt(Instant.now());
        e.setActorUserId(actorUserId);
        e.setActorLabel(truncate(label, MAX_LABEL));
        e.setAction(truncate(nullToEmpty(action), 200));
        e.setEntityType(entityType != null ? truncate(entityType, 50) : null);
        e.setEntityId(entityId != null ? truncate(entityId, 100) : null);
        e.setCategory(category);
        e.setStatusLabel(statusLabel != null ? truncate(statusLabel, 50) : null);
        e.setStatusTone(statusTone != null ? truncate(statusTone, 20) : null);
        e.setSummary(truncate(nullToEmpty(summary), MAX_SUMMARY));
        repository.save(e);
    }

    private AuditActivityResponse toResponse(PlatformAuditEventEntity e) {
        String label = e.getActorLabel() != null ? e.getActorLabel() : "?";
        return AuditActivityResponse.builder()
                .id(e.getId().toString())
                .occurredAt(e.getCreatedAt() != null ? e.getCreatedAt().toString() : "")
                .actor(label)
                .actorInitials(initialsFromLabel(label))
                .action(e.getAction())
                .actionDanger("critical".equalsIgnoreCase(e.getStatusTone()))
                .entity(e.getEntityId() != null ? e.getEntityId() : "")
                .status(e.getStatusLabel() != null ? e.getStatusLabel() : "—")
                .statusTone(e.getStatusTone() != null ? e.getStatusTone() : "neutral")
                .ip(null)
                .category(e.getCategory())
                .body(e.getSummary())
                .build();
    }

    private String resolveActorLabel(UUID actorUserId) {
        if (actorUserId == null) {
            return "system";
        }
        return userRepository
                .findById(actorUserId)
                .map(u -> u.getEmail() != null && !u.getEmail().isBlank() ? u.getEmail() : actorUserId.toString())
                .orElse("unknown");
    }

    private static String nullToEmpty(String s) {
        return s != null ? s : "";
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max);
    }

    private static String initialsFromLabel(String label) {
        if (label == null || label.isBlank()) {
            return "?";
        }
        String s = label.split("@")[0].trim();
        String[] parts = s.split("[\\s._-]+");
        if (parts.length >= 2 && parts[0].length() > 0 && parts[1].length() > 0) {
            return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
        }
        if (s.length() >= 2) {
            return s.substring(0, 2).toUpperCase();
        }
        return s.substring(0, 1).toUpperCase();
    }
}
