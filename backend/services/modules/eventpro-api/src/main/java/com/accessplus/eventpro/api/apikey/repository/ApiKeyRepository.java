package com.accessplus.eventpro.api.apikey.repository;

import com.accessplus.eventpro.api.apikey.entity.ApiKeyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApiKeyRepository extends JpaRepository<ApiKeyEntity, UUID> {

    List<ApiKeyEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("SELECT k FROM ApiKeyEntity k WHERE k.keyPrefix = :prefix")
    Optional<ApiKeyEntity> findByKeyPrefix(@Param("prefix") String prefix);
}
