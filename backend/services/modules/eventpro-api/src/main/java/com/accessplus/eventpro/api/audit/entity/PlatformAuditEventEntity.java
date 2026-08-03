package com.accessplus.eventpro.api.audit.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Append-only audit row for admin visibility. Inserts only — no updates/deletes from application code.
 */
@Entity
@Table(name = "platform_audit_events")
@Getter
@Setter
@NoArgsConstructor
public class PlatformAuditEventEntity {

    @Id
    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "actor_user_id")
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID actorUserId;

    @Column(name = "actor_label", nullable = false, length = 255)
    private String actorLabel;

    @Column(name = "action", nullable = false, length = 200)
    private String action;

    @Column(name = "entity_type", length = 50)
    private String entityType;

    @Column(name = "entity_id", length = 100)
    private String entityId;

    @Column(name = "category", nullable = false, length = 30)
    private String category;

    @Column(name = "status_label", length = 50)
    private String statusLabel;

    @Column(name = "status_tone", length = 20)
    private String statusTone;

    @Column(name = "summary", nullable = false, columnDefinition = "TEXT")
    private String summary;
}
