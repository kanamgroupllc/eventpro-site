package com.accessplus.eventpro.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddEventImageRequest {

    @NotBlank(message = "Image URL is required")
    @Size(max = 500)
    private String imageUrl;

    private Integer displayOrder;
}
