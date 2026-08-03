package com.accessplus.eventpro.api.team.entity;

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
@Table(name = "organizer_team_members", indexes = {
    @Index(name = "idx_organizer_team_members_organizer_id", columnList = "organizer_id"),
    @Index(name = "idx_organizer_team_members_user_id", columnList = "user_id")
}, uniqueConstraints = @UniqueConstraint(columnNames = { "organizer_id", "user_id" }))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OrganizerTeamMemberEntity {

    @Id
    @GeneratedValue
    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organizer_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID organizerId;

    @Column(name = "user_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID userId;

    @Column(name = "role", nullable = false, length = 20)
    private String role = "EDITOR";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
