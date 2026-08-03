package com.accessplus.eventpro.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromoteUserRequest {
    
    @NotBlank(message = "Target role is required")
    @Pattern(regexp = "ORGANIZER", message = "Users can only be promoted to ORGANIZER role. ADMIN role can only be assigned via infrastructure.")
    private String targetRole;
}

