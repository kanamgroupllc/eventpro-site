package com.accessplus.eventpro.api.payout.repository;

import com.accessplus.eventpro.api.payout.entity.PayoutRequestEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PayoutRequestRepository extends JpaRepository<PayoutRequestEntity, UUID> {

    Page<PayoutRequestEntity> findByUserIdOrderByRequestedAtDesc(UUID userId, Pageable pageable);
}
