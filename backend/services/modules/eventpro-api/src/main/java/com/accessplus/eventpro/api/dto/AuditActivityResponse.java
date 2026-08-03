package com.accessplus.eventpro.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Single row for admin audit / activity feed (derived from orders, users, events — not a separate audit log table).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditActivityResponse {
    private String id;
    /** ISO-8601 timestamp */
    private String occurredAt;
    private String actor;
    private String actorInitials;
    private String action;
    private boolean actionDanger;
    private String entity;
    private String status;
    /** success | info | critical | pending | neutral */
    private String statusTone;
    private String ip;
    /** security | finance | users | events | system */
    private String category;
    private String body;
}
