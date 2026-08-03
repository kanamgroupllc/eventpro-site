package com.accessplus.eventpro.event.event.repository;

import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.category.entity.CategoryEntity;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.shared.enums.EventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EventRepository extends JpaRepository<EventEntity, UUID> {

    @Query("SELECT e FROM EventEntity e JOIN FETCH e.organizer WHERE e.id = :id")
    Optional<EventEntity> findByIdWithOrganizer(@Param("id") UUID id);

    Page<EventEntity> findByCategory(CategoryEntity category, Pageable pageable);

    Page<EventEntity> findByOrganizer(UserEntity organizer, Pageable pageable);

    Page<EventEntity> findByMarketingEnabled(Boolean marketingEnabled, Pageable pageable);

    Page<EventEntity> findByStartTimeAfter(LocalDateTime startTime, Pageable pageable);

    Page<EventEntity> findByStartTimeBetween(LocalDateTime startTime, LocalDateTime endTime, Pageable pageable);

    @Query("SELECT e FROM EventEntity e WHERE e.category.id = :categoryId")
    Page<EventEntity> findByCategoryId(@Param("categoryId") UUID categoryId, Pageable pageable);

    @Query("SELECT e FROM EventEntity e WHERE e.organizer.id = :organizerId")
    Page<EventEntity> findByOrganizerId(@Param("organizerId") UUID organizerId, Pageable pageable);

    @Query("SELECT e FROM EventEntity e WHERE e.organizer.id IN :organizerIds")
    Page<EventEntity> findByOrganizerIdIn(@Param("organizerIds") Collection<UUID> organizerIds, Pageable pageable);

    @Query("SELECT e FROM EventEntity e WHERE LOWER(e.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    Page<EventEntity> findByNameContainingIgnoreCase(@Param("name") String name, Pageable pageable);

    @Query("SELECT DISTINCT e FROM EventEntity e " +
           "JOIN TicketEntity t ON t.eventId = e.id " +
           "JOIN OrderItemEntity oi ON oi.ticket.id = t.id " +
           "JOIN OrderEntity o ON o.id = oi.order.id " +
           "WHERE o.userId = :userId")
    Page<EventEntity> findEventsByUserPurchases(@Param("userId") UUID userId, Pageable pageable);

    // Status-based queries
    Page<EventEntity> findByStatus(EventStatus status, Pageable pageable);

    @Query("SELECT e FROM EventEntity e WHERE e.organizer.id = :organizerId AND e.status = :status")
    Page<EventEntity> findByOrganizerIdAndStatus(@Param("organizerId") UUID organizerId,
                                                   @Param("status") EventStatus status,
                                                   Pageable pageable);

    @Query("SELECT e FROM EventEntity e WHERE e.status = :status AND LOWER(e.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    Page<EventEntity> findByStatusAndNameContainingIgnoreCase(@Param("status") EventStatus status,
                                                                @Param("name") String name,
                                                                Pageable pageable);

    @Query("SELECT e FROM EventEntity e WHERE e.category.id = :categoryId AND e.status = :status")
    Page<EventEntity> findByCategoryIdAndStatus(@Param("categoryId") UUID categoryId,
                                                  @Param("status") EventStatus status,
                                                  Pageable pageable);
}

