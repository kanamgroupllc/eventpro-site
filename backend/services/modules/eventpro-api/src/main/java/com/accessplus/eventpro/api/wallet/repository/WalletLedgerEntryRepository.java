package com.accessplus.eventpro.api.wallet.repository;

import com.accessplus.eventpro.api.wallet.entity.WalletLedgerEntryEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface WalletLedgerEntryRepository extends JpaRepository<WalletLedgerEntryEntity, UUID> {

    Page<WalletLedgerEntryEntity> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Optional<WalletLedgerEntryEntity> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);
}
