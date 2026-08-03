package com.accessplus.eventpro.api.audit.repository;

import com.accessplus.eventpro.api.audit.entity.PlatformAuditEventEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface PlatformAuditEventRepository extends JpaRepository<PlatformAuditEventEntity, UUID> {

    @Query(
            "SELECT e FROM PlatformAuditEventEntity e WHERE "
                    + "(:category IS NULL OR e.category = :category) AND "
                    + "(:search IS NULL OR :search = '' OR "
                    + "LOWER(e.summary) LIKE LOWER(CONCAT('%', :search, '%')) OR "
                    + "LOWER(e.actorLabel) LIKE LOWER(CONCAT('%', :search, '%')) OR "
                    + "LOWER(e.action) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<PlatformAuditEventEntity> findFiltered(
            @Param("category") String category,
            @Param("search") String search,
            Pageable pageable);
}
