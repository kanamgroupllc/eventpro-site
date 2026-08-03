package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.audit.AuditLogService;
import com.accessplus.eventpro.api.dto.ApiResponse;
import com.accessplus.eventpro.api.dto.AuthLoginRequest;
import com.accessplus.eventpro.api.dto.AuthResponse;
import com.accessplus.eventpro.api.dto.AuthSignupRequest;
import com.accessplus.eventpro.api.dto.SendResetEmailRequest;
import com.accessplus.eventpro.api.dto.UserResponse;
import com.accessplus.eventpro.api.service.AuthResult;
import com.accessplus.eventpro.api.service.AuthService;
import com.accessplus.eventpro.api.security.RecaptchaVerificationService;
import com.accessplus.eventpro.api.util.ClientIpResolver;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.email.service.EmailService;
import com.accessplus.eventpro.core.security.CsrfTokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Authentication API")
public class AuthController extends BaseController {

    private final EmailService emailService;
    private final AuthService authService;
    private final RecaptchaVerificationService recaptchaVerificationService;
    private final CsrfTokenService csrfTokenService;

    @PostMapping("/signup")
    @Operation(summary = "Sign up", description = "Creates a new user account.")
    public ResponseEntity<ApiResponse<UserResponse>> signUp(
            @Valid @RequestBody AuthSignupRequest request,
            HttpServletRequest httpRequest) {
        log.info("Signing up user: email={}", request.getEmail());
        recaptchaVerificationService.verify(request.getRecaptchaToken(), ClientIpResolver.resolve(httpRequest), "signup");

        UserEntity user = authService.signUp(request);
        UserResponse response = UserResponse.fromEntity(user);
        return ResponseEntity.ok(ApiResponse.success(response, "Signup successful"));
    }

    @PostMapping("/login")
    @Operation(summary = "Login", description = "Authenticates user and returns a JWT access token.")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody AuthLoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        log.debug("Logging in user: email={}", request.getEmail());
        recaptchaVerificationService.verify(request.getRecaptchaToken(), ClientIpResolver.resolve(httpRequest), "login");

        AuthResult result = authService.login(request);
        AuthResponse response = AuthResponse.builder()
                .accessToken(result.accessToken())
                .expiresIn(result.expiresIn())
                .user(UserResponse.fromEntity(result.user()))
                .build();

        var rotatedCsrfToken = csrfTokenService.rotate(httpRequest, httpResponse);
        httpResponse.setHeader(rotatedCsrfToken.getHeaderName(), rotatedCsrfToken.getToken());

        return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
    }

    @PostMapping("/send-reset-email")
    @Operation(summary = "Send password reset confirmation email", 
               description = "Sends a confirmation email after password reset with the verification code.")
    public ResponseEntity<ApiResponse<Void>> sendResetEmail(
            @Valid @RequestBody SendResetEmailRequest request) {
        log.debug("Sending password reset confirmation email to: {}", request.getEmail());

        try {
            emailService.sendPasswordResetConfirmation(request.getEmail(), request.getCode());
            return ResponseEntity.ok(ApiResponse.success(null, "Password reset confirmation email sent successfully"));
        } catch (Exception e) {
            log.error("Failed to send password reset confirmation email: {}", e.getMessage(), e);
            return ResponseEntity.ok(ApiResponse.success(null, "Email sending attempted (may have failed silently)"));
        }
    }
}
