package com.accessplus.eventpro.api.follow.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "organizer_follows", indexes = {
    @Index(name = "idx_organizer_follows_user_id", columnList = "user_id"),
    @Index(name = "idx_organizer_follows_organizer_id", columnList = "organizer_id")
}, uniqueConstraints = @UniqueConstraint(columnNames = { "user_id", "organizer_id" }))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OrganizerFollowEntity {

    @Id
    @GeneratedValue
    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID userId;

    @Column(name = "organizer_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID organizerId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
