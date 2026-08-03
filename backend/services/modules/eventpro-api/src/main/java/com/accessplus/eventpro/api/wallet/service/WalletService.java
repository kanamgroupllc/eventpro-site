package com.accessplus.eventpro.api.wallet.service;

import com.accessplus.eventpro.api.audit.AuditLogService;
import com.accessplus.eventpro.api.wallet.dto.WalletBalanceResponse;
import com.accessplus.eventpro.api.wallet.dto.WalletLedgerEntryResponse;
import com.accessplus.eventpro.api.wallet.entity.WalletAccountEntity;
import com.accessplus.eventpro.api.wallet.entity.WalletLedgerEntryEntity;
import com.accessplus.eventpro.api.wallet.repository.WalletAccountRepository;
import com.accessplus.eventpro.api.wallet.repository.WalletLedgerEntryRepository;
import com.accessplus.eventpro.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WalletService {

    public static final String REF_ORDER_REFUND = "ORDER_REFUND";
    public static final String REF_CHECKOUT = "CHECKOUT";
    public static final String REF_CHECKOUT_REVERSAL = "CHECKOUT_REVERSAL";

    private final WalletAccountRepository accountRepository;
    private final WalletLedgerEntryRepository ledgerRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public WalletBalanceResponse getBalance(UUID userId) {
        return accountRepository.findByUserId(userId)
                .map(a -> WalletBalanceResponse.builder().balance(a.getBalance()).currency(a.getCurrency()).build())
                .orElse(WalletBalanceResponse.builder().balance(BigDecimal.ZERO).currency("USD").build());
    }

    @Transactional(readOnly = true)
    public Page<WalletLedgerEntryResponse> getLedger(UUID userId, Pageable pageable) {
        return ledgerRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    @Transactional
    public WalletLedgerEntryEntity credit(UUID userId, BigDecimal amount, String referenceType,
                                          UUID referenceId, String idempotencyKey, String description) {
        validateAmount(amount);
        return ledgerRepository.findByIdempotencyKey(idempotencyKey)
                .orElseGet(() -> applyEntry(userId, amount, "CREDIT", referenceType, referenceId, idempotencyKey, description));
    }

    @Transactional
    public WalletLedgerEntryEntity debit(UUID userId, BigDecimal amount, String referenceType,
                                         UUID referenceId, String idempotencyKey, String description) {
        validateAmount(amount);
        return ledgerRepository.findByIdempotencyKey(idempotencyKey)
                .orElseGet(() -> {
                    WalletAccountEntity account = lockOrCreateAccount(userId);
                    if (account.getBalance().compareTo(amount) < 0) {
                        throw new ValidationException("Insufficient Electric Wallet balance.");
                    }
                    return applyEntryOnAccount(account, amount, "DEBIT", referenceType, referenceId, idempotencyKey, description);
                });
    }

    private WalletLedgerEntryEntity applyEntry(UUID userId, BigDecimal amount, String entryType,
                                               String referenceType, UUID referenceId,
                                               String idempotencyKey, String description) {
        WalletAccountEntity account = lockOrCreateAccount(userId);
        if ("DEBIT".equals(entryType) && account.getBalance().compareTo(amount) < 0) {
            throw new ValidationException("Insufficient Electric Wallet balance.");
        }
        return applyEntryOnAccount(account, amount, entryType, referenceType, referenceId, idempotencyKey, description);
    }

    private WalletLedgerEntryEntity applyEntryOnAccount(WalletAccountEntity account, BigDecimal amount,
                                                        String entryType, String referenceType, UUID referenceId,
                                                        String idempotencyKey, String description) {
        BigDecimal newBalance = "CREDIT".equals(entryType)
                ? account.getBalance().add(amount)
                : account.getBalance().subtract(amount);
        account.setBalance(newBalance);
        account.setUpdatedAt(Instant.now());
        accountRepository.save(account);

        WalletLedgerEntryEntity entry = new WalletLedgerEntryEntity();
        entry.setUserId(account.getUserId());
        entry.setAmount(amount);
        entry.setEntryType(entryType);
        entry.setReferenceType(referenceType);
        entry.setReferenceId(referenceId);
        entry.setIdempotencyKey(idempotencyKey);
        entry.setDescription(description);
        entry.setBalanceAfter(newBalance);
        WalletLedgerEntryEntity saved = ledgerRepository.save(entry);
        log.info("Wallet {}: userId={}, amount={}, referenceType={}, balanceAfter={}",
                entryType, account.getUserId(), amount, referenceType, newBalance);
        recordWalletAudit(account.getUserId(), entryType, amount, referenceType, referenceId, description);
        return saved;
    }

    private void recordWalletAudit(UUID userId, String entryType, BigDecimal amount,
                                   String referenceType, UUID referenceId, String description) {
        if (!REF_CHECKOUT.equals(referenceType) && !REF_ORDER_REFUND.equals(referenceType)
                && !REF_CHECKOUT_REVERSAL.equals(referenceType)) {
            return;
        }
        String action = "CREDIT".equals(entryType) ? "WALLET_CREDIT" : "WALLET_DEBIT";
        auditLogService.recordFinanceEvent(
                userId,
                action,
                "wallet",
                referenceId != null ? referenceId.toString() : userId.toString(),
                description != null ? description : action + " " + amount);
    }

    private WalletAccountEntity lockOrCreateAccount(UUID userId) {
        return accountRepository.findByUserIdForUpdate(userId)
                .orElseGet(() -> {
                    WalletAccountEntity created = WalletAccountEntity.withDefaults(userId);
                    return accountRepository.save(created);
                });
    }

    private static void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Wallet amount must be greater than 0.");
        }
    }

    private WalletLedgerEntryResponse toResponse(WalletLedgerEntryEntity e) {
        return WalletLedgerEntryResponse.builder()
                .id(e.getId())
                .amount(e.getAmount())
                .entryType(e.getEntryType())
                .referenceType(e.getReferenceType())
                .referenceId(e.getReferenceId())
                .description(e.getDescription())
                .balanceAfter(e.getBalanceAfter())
                .createdAt(e.getCreatedAt())
                .build();
    }
}
