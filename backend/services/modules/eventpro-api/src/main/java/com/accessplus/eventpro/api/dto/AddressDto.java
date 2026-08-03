package com.accessplus.eventpro.api.dto;

import com.accessplus.eventpro.event.address.entity.AddressEntity;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AddressDto {
    
    private UUID id;
    
    private String street;
    
    @NotBlank(message = "City is required")
    private String city;
    
    private String state;
    
    private String zipCode;
    
    @NotBlank(message = "Country is required")
    private String country;
    
    private BigDecimal latitude;
    
    private BigDecimal longitude;
    
    public static AddressDto fromEntity(AddressEntity entity) {
        if (entity == null) {
            return null;
        }
        
        return AddressDto.builder()
                .id(entity.getId())
                .street(entity.getStreet())
                .city(entity.getCity())
                .state(entity.getState())
                .zipCode(entity.getZipCode())
                .country(entity.getCountry())
                .latitude(entity.getLatitude())
                .longitude(entity.getLongitude())
                .build();
    }
    
    public AddressEntity toEntity() {
        AddressEntity entity = new AddressEntity();
        entity.setStreet(this.street);
        entity.setCity(this.city);
        entity.setState(this.state);
        entity.setZipCode(this.zipCode);
        entity.setCountry(this.country);
        entity.setLatitude(this.latitude);
        entity.setLongitude(this.longitude);
        return entity;
    }
}

