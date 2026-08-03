package com.accessplus.eventpro.api.apikey.service;

import com.accessplus.eventpro.api.apikey.entity.ApiKeyEntity;

import java.util.List;
import java.util.UUID;

/**
 * API key management (Enterprise only). Create, list, revoke keys for programmatic access.
 */
public interface ApiKeyService {

    /**
     * Creates a new API key for the user. Returns the plain key (shown once). Caller must gate by Enterprise tier.
     */
    CreateApiKeyResult createKey(UUID userId, String name);

    List<ApiKeyEntity> listKeys(UUID userId);

    void revoke(UUID keyId, UUID userId);

    /**
     * Resolves user ID from a raw API key (e.g. from X-Api-Key header). Returns empty if invalid.
     */
    java.util.Optional<UUID> resolveUserIdFromKey(String rawKey);

    record CreateApiKeyResult(UUID id, String name, String keyPrefix, String key) {}
}
