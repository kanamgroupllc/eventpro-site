package com.accessplus.eventpro.event.address.entity;

import com.accessplus.eventpro.shared.entity.BaseEntity;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;


@Entity
@Table(name = "addresses", indexes = {
    @Index(name = "idx_address_city_state", columnList = "city, state")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AddressEntity extends BaseEntity {

    @Column(name = "street", nullable = false, length = 255)
    private String street;

    @Column(name = "city", nullable = false, length = 100)
    private String city;

    @Column(name = "state", nullable = false, length = 100)
    private String state;

    @Column(name = "zip_code", nullable = false, length = 20)
    private String zipCode;

    @Column(name = "country", nullable = false, length = 100)
    private String country;

    @Column(name = "latitude", precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 11, scale = 8)
    private BigDecimal longitude;

    /**
     * Event associated with this address (one-to-one bidirectional relationship).
     * One address is associated with one event.
     */
    @OneToOne(mappedBy = "address", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private EventEntity event;
}

