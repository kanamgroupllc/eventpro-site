package com.accessplus.eventpro.api.dto;

import jakarta.validation.constraints.Email;
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
public class ContactOrganizerRequest {

    @NotBlank(message = "Email is required")
    @Email
    private String senderEmail;

    @Size(max = 200)
    private String senderName;

    @NotBlank(message = "Message is required")
    @Size(max = 2000)
    private String message;
}
