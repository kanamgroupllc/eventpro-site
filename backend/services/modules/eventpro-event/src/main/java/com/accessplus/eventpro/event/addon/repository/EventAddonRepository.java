package com.accessplus.eventpro.event.addon.repository;

import com.accessplus.eventpro.event.addon.entity.EventAddonEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EventAddonRepository extends JpaRepository<EventAddonEntity, UUID> {

    @Query("SELECT a FROM EventAddonEntity a JOIN FETCH a.event WHERE a.event.id = :eventId ORDER BY a.displayOrder ASC")
    List<EventAddonEntity> findByEventIdOrderByDisplayOrderAsc(@Param("eventId") UUID eventId);
}
