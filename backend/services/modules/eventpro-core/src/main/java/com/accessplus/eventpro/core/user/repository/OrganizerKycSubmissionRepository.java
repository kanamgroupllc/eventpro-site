package com.accessplus.eventpro.core.user.repository;

import com.accessplus.eventpro.core.user.entity.OrganizerKycSubmissionEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrganizerKycSubmissionRepository extends JpaRepository<OrganizerKycSubmissionEntity, UUID> {

    List<OrganizerKycSubmissionEntity> findByUserIdOrderBySubmittedAtDesc(UUID userId, Pageable pageable);

    List<OrganizerKycSubmissionEntity> findByStatusOrderBySubmittedAtDesc(String status, Pageable pageable);
}
