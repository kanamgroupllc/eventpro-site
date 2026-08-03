package com.accessplus.eventpro.event.address.repository;

import com.accessplus.eventpro.event.address.entity.AddressEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AddressRepository extends JpaRepository<AddressEntity, UUID> {

    List<AddressEntity> findByCityAndState(String city, String state);

    List<AddressEntity> findByCity(String city);

    List<AddressEntity> findByState(String state);

    List<AddressEntity> findByCountry(String country);

    @Query("SELECT a FROM AddressEntity a WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL " +
           "AND a.latitude BETWEEN :minLat AND :maxLat " +
           "AND a.longitude BETWEEN :minLng AND :maxLng")
    List<AddressEntity> findWithinBounds(
            @Param("minLat") java.math.BigDecimal minLat,
            @Param("maxLat") java.math.BigDecimal maxLat,
            @Param("minLng") java.math.BigDecimal minLng,
            @Param("maxLng") java.math.BigDecimal maxLng
    );
}

