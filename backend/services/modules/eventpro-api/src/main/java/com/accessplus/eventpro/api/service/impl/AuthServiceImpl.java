package com.accessplus.eventpro.api.service.impl;

import com.accessplus.eventpro.api.dto.AuthLoginRequest;
import com.accessplus.eventpro.api.dto.AuthSignupRequest;
import com.accessplus.eventpro.api.dto.CreateAdminUserRequest;
import com.accessplus.eventpro.api.service.AuthResult;
import com.accessplus.eventpro.api.service.AuthService;
import com.accessplus.eventpro.core.security.JwtService;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.core.user.service.UserService;
import com.accessplus.eventpro.shared.exception.UnauthorizedException;
import com.accessplus.eventpro.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final Set<String> ALLOWED_ROLES = Set.of("USER", "ORGANIZER");

    private final UserService userService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Override
    public UserEntity signUp(AuthSignupRequest request) {
        String email = normalizeEmail(request.getEmail());
        String role = normalizeRole(request.getRole());
        String passwordHash = passwordEncoder.encode(request.getPassword());

        log.info("Signing up user: email={}, role={}", email, role);
        return userService.createUser(
                email,
                passwordHash,
                request.getFirstName(),
                request.getLastName(),
                request.getPhoneNumber(),
                role
        );
    }

    @Override
    public AuthResult login(AuthLoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        UserEntity user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            throw new UnauthorizedException("Password login is not available for this user");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        return issueToken(user);
    }

    private AuthResult issueToken(UserEntity user) {
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());
        long ttlSeconds = jwtService.getAccessTokenTtlSeconds();
        return new AuthResult(token, ttlSeconds, user);
    }

    private String normalizeEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new ValidationException("Email is required");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeRole(String role) {
        if (role == null || role.trim().isEmpty()) {
            return "USER";
        }
        String normalized = role.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_ROLES.contains(normalized)) {
            throw new ValidationException("Invalid role: " + role);
        }
        return normalized;
    }

    @Override
    public UserEntity createAdminUser(CreateAdminUserRequest request) {
        String email = normalizeEmail(request.getEmail());
        String passwordHash = passwordEncoder.encode(request.getPassword());
        log.info("Creating admin user: email={}", email);
        return userService.createUser(
                email,
                passwordHash,
                request.getFirstName(),
                request.getLastName(),
                request.getPhoneNumber(),
                "ADMIN"
        );
    }
}
