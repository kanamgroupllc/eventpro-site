package com.accessplus.eventpro.api.team.repository;

import com.accessplus.eventpro.api.team.entity.OrganizerTeamMemberEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizerTeamMemberRepository extends JpaRepository<OrganizerTeamMemberEntity, UUID> {

    List<OrganizerTeamMemberEntity> findByOrganizerIdOrderByCreatedAtAsc(UUID organizerId);

    @Query("SELECT m.organizerId FROM OrganizerTeamMemberEntity m WHERE m.userId = :userId")
    List<UUID> findOrganizerIdsByMemberUserId(@Param("userId") UUID userId);

    Optional<OrganizerTeamMemberEntity> findByOrganizerIdAndUserId(UUID organizerId, UUID userId);

    boolean existsByOrganizerIdAndUserId(UUID organizerId, UUID userId);

    void deleteByOrganizerIdAndUserId(UUID organizerId, UUID userId);
}
