package com.accessplus.eventpro.api.wallet.controller;

import com.accessplus.eventpro.api.controller.BaseController;
import com.accessplus.eventpro.api.dto.ApiResponse;
import com.accessplus.eventpro.api.wallet.dto.WalletBalanceResponse;
import com.accessplus.eventpro.api.wallet.dto.WalletLedgerEntryResponse;
import com.accessplus.eventpro.api.wallet.service.WalletService;
import com.accessplus.eventpro.core.security.JwtUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/wallet")
@RequiredArgsConstructor
@Tag(name = "Wallet", description = "Electric Wallet store credit")
public class WalletController extends BaseController {

    private final WalletService walletService;

    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get Electric Wallet balance")
    public ResponseEntity<ApiResponse<WalletBalanceResponse>> getBalance() {
        UUID userId = JwtUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(walletService.getBalance(userId), null));
    }

    @GetMapping("/ledger")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get Electric Wallet transaction history")
    public ResponseEntity<ApiResponse<Page<WalletLedgerEntryResponse>>> getLedger(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = JwtUtils.getCurrentUserId();
        int pageIndex = Math.max(0, page);
        int pageSize = Math.min(Math.max(1, size), 100);
        Page<WalletLedgerEntryResponse> result = walletService.getLedger(
                userId, PageRequest.of(pageIndex, pageSize, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.success(result, null));
    }
}
