package com.accessplus.eventpro.api.wallet.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "wallet_accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WalletAccountEntity {

    @Id
    @Column(name = "user_id", updatable = false, nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID userId;

    @Column(name = "balance", nullable = false, precision = 12, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "USD";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public static WalletAccountEntity withDefaults(UUID userId) {
        WalletAccountEntity account = new WalletAccountEntity();
        account.setUserId(userId);
        account.setBalance(BigDecimal.ZERO);
        account.setCurrency("USD");
        account.setCreatedAt(Instant.now());
        account.setUpdatedAt(Instant.now());
        return account;
    }
}
