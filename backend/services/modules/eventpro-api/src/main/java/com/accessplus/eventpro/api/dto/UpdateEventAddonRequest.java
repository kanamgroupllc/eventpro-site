package com.accessplus.eventpro.api.dto;

import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEventAddonRequest {

    private String name;
    private String description;

    @DecimalMin(value = "0", inclusive = false, message = "Price must be positive")
    private BigDecimal price;

    private String category;
    private String imageUrl;
    private List<String> sizes;
    private Boolean isPopular;
    private Integer displayOrder;
}
