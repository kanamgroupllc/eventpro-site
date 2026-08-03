package com.accessplus.eventpro.api.notification.repository;

import com.accessplus.eventpro.api.notification.entity.UserNotificationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserNotificationRepository extends JpaRepository<UserNotificationEntity, UUID> {

    Page<UserNotificationEntity> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Optional<UserNotificationEntity> findByIdAndUserId(UUID id, UUID userId);
}
