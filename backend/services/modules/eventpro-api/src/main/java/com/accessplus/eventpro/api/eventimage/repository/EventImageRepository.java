package com.accessplus.eventpro.api.eventimage.repository;

import com.accessplus.eventpro.api.eventimage.entity.EventImageEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EventImageRepository extends JpaRepository<EventImageEntity, UUID> {

    List<EventImageEntity> findByEventIdOrderByDisplayOrderAsc(UUID eventId);

    void deleteByEventId(UUID eventId);

    /** Count gallery images for an event (max 4 allowed; primary image = 1, so total max 5). */
    long countByEventId(UUID eventId);
}
