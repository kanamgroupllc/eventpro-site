package com.accessplus.eventpro.api.apikey.service.impl;

import com.accessplus.eventpro.api.apikey.entity.ApiKeyEntity;
import com.accessplus.eventpro.api.apikey.repository.ApiKeyRepository;
import com.accessplus.eventpro.api.apikey.service.ApiKeyService;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApiKeyServiceImpl implements ApiKeyService {

    private static final int KEY_BYTES = 32;
    private static final int PREFIX_LENGTH = 8;

    private final ApiKeyRepository apiKeyRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public CreateApiKeyResult createKey(UUID userId, String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new ValidationException("API key name is required");
        }
        String rawKey = generateKey();
        String prefix = rawKey.substring(0, Math.min(PREFIX_LENGTH, rawKey.length()));
        String hash = passwordEncoder.encode(rawKey);

        ApiKeyEntity entity = new ApiKeyEntity();
        entity.setUserId(userId);
        entity.setName(name.trim());
        entity.setKeyPrefix(prefix);
        entity.setKeyHash(hash);
        entity.setScope("read");
        entity = apiKeyRepository.save(entity);
        log.info("API key created: userId={}, keyId={}, prefix={}", userId, entity.getId(), prefix);
        return new CreateApiKeyResult(entity.getId(), entity.getName(), prefix, rawKey);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApiKeyEntity> listKeys(UUID userId) {
        return apiKeyRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    @Transactional
    public void revoke(UUID keyId, UUID userId) {
        ApiKeyEntity entity = apiKeyRepository.findById(keyId)
                .orElseThrow(() -> new ResourceNotFoundException("API key", keyId.toString()));
        if (!entity.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("API key", keyId.toString());
        }
        apiKeyRepository.delete(entity);
        log.info("API key revoked: keyId={}, userId={}", keyId, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UUID> resolveUserIdFromKey(String rawKey) {
        if (rawKey == null || rawKey.length() < PREFIX_LENGTH) {
            return Optional.empty();
        }
        String prefix = rawKey.substring(0, PREFIX_LENGTH);
        return apiKeyRepository.findByKeyPrefix(prefix)
                .filter(entity -> passwordEncoder.matches(rawKey, entity.getKeyHash()))
                .map(ApiKeyEntity::getUserId);
    }

    private static String generateKey() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[KEY_BYTES];
        random.nextBytes(bytes);
        StringBuilder sb = new StringBuilder(KEY_BYTES * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
