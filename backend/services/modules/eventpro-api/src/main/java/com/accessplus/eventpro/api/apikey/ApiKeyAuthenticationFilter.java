package com.accessplus.eventpro.api.apikey;

import com.accessplus.eventpro.api.apikey.service.ApiKeyService;
import com.accessplus.eventpro.core.security.CsrfRequestAttributes;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Locale;

/**
 * Runs before JWT filter. If X-Api-Key header is present and no Bearer token, resolves user and sets auth (Enterprise API access).
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    private final ApiKeyService apiKeyService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }
        String apiKey = request.getHeader("X-Api-Key");
        if (apiKey == null || apiKey.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }
        apiKeyService.resolveUserIdFromKey(apiKey.trim())
                .flatMap(userRepository::findById)
                .ifPresentOrElse(
                        user -> {
                            setAuthentication(user);
                            request.setAttribute(CsrfRequestAttributes.API_KEY_AUTHENTICATED, Boolean.TRUE);
                        },
                        () -> log.debug("Invalid or unknown API key")
                );
        filterChain.doFilter(request, response);
    }

    private void setAuthentication(UserEntity user) {
        String role = user.getRole() != null ? user.getRole().toUpperCase(Locale.ROOT) : "USER";
        List<SimpleGrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + role)
        );
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                user.getId().toString(), null, authorities);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
