package com.accessplus.eventpro.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InviteTeamMemberRequest {

    @NotBlank(message = "Email is required")
    @Email
    private String email;

    @NotBlank(message = "Role is required")
    @Pattern(regexp = "ADMIN|EDITOR|VIEWER", message = "Role must be ADMIN, EDITOR, or VIEWER")
    private String role;
}
