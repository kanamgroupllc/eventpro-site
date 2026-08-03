package com.accessplus.eventpro.api.follow.repository;

import com.accessplus.eventpro.api.follow.entity.OrganizerFollowEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizerFollowRepository extends JpaRepository<OrganizerFollowEntity, UUID> {

    Optional<OrganizerFollowEntity> findByUserIdAndOrganizerId(UUID userId, UUID organizerId);

    boolean existsByUserIdAndOrganizerId(UUID userId, UUID organizerId);

    List<OrganizerFollowEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("SELECT f.organizerId FROM OrganizerFollowEntity f WHERE f.userId = :userId")
    List<UUID> findOrganizerIdsByUserId(@Param("userId") UUID userId);
}
