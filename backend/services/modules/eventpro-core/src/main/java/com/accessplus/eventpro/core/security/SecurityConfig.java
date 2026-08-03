package com.accessplus.eventpro.core.security;

import com.accessplus.eventpro.core.config.CorsProperties;
import com.accessplus.eventpro.core.config.EventProApiSecurityProperties;
import com.accessplus.eventpro.core.config.EventProCsrfProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CorsProperties corsProperties;
    private final EventProApiSecurityProperties apiSecurityProperties;
    private final EventProCsrfProperties csrfProperties;
    private final AccessDeniedHandler accessDeniedHandler;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          CorsProperties corsProperties,
                          EventProApiSecurityProperties apiSecurityProperties,
                          EventProCsrfProperties csrfProperties,
                          AccessDeniedHandler accessDeniedHandler) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.corsProperties = corsProperties;
        this.apiSecurityProperties = apiSecurityProperties;
        this.csrfProperties = csrfProperties;
        this.accessDeniedHandler = accessDeniedHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()));

        if (csrfProperties.isEnabled()) {
            RequestMatcher apiKeyAuthenticated = request -> Boolean.TRUE.equals(
                    request.getAttribute(CsrfRequestAttributes.API_KEY_AUTHENTICATED));
            RequestMatcher mobileClient = request -> CsrfRequestAttributes.MOBILE_CLIENT_VALUE.equalsIgnoreCase(
                    request.getHeader(CsrfRequestAttributes.MOBILE_CLIENT_HEADER));

            http.csrf(csrf -> csrf
                    .csrfTokenRepository(csrfTokenRepository())
                    .csrfTokenRequestHandler(new DeferredSpaCsrfTokenRequestHandler())
                    .ignoringRequestMatchers("/actuator/**", "/api/v1/webhooks/stripe",
                            "/api/v1/webhooks/stripe/")
                    .ignoringRequestMatchers(apiKeyAuthenticated, mobileClient));
        } else {
            http.csrf(AbstractHttpConfigurer::disable);
        }

        http
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions.accessDeniedHandler(accessDeniedHandler))
            .authorizeHttpRequests(auth -> {
                auth.requestMatchers("/actuator/health").permitAll();
                auth.requestMatchers(HttpMethod.GET, "/api/v1/csrf").permitAll();
                if (apiSecurityProperties.isPublicActuatorMetrics()) {
                    auth.requestMatchers("/actuator/metrics", "/actuator/metrics/**",
                            "/actuator/prometheus").permitAll();
                }
                if (apiSecurityProperties.isPublicSwagger()) {
                    auth.requestMatchers("/swagger-ui/**", "/swagger-ui.html",
                            "/v3/api-docs/**", "/api-docs/**").permitAll();
                }
                auth.requestMatchers(HttpMethod.POST, "/api/v1/auth/signup", "/api/v1/auth/login", "/api/v1/auth/send-reset-email").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/events").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/events/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/events/*/ticket-types").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/events/*/seats").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/events/*/addons").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/events/category/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/images/proxy").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/payments/config").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/users/*/public-profile").permitAll()
                .requestMatchers(HttpMethod.POST,
                    "/api/v1/payments/create-intent", "/api/v1/payments/create-intent/",
                    "/api/v1/payments/guest/confirm", "/api/v1/payments/guest/confirm/",
                    "/api/v1/payments/guest-reserve", "/api/v1/payments/guest-reserve/").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/webhooks/stripe").permitAll()
                .requestMatchers("/api/v1/checkout-sessions/**", "/api/v1/checkout-sessions").permitAll()
                .anyRequest().authenticated();
            })
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CsrfTokenRepository csrfTokenRepository() {
        CookieCsrfTokenRepository repository = new CookieCsrfTokenRepository();
        repository.setCookiePath("/");
        repository.setCookieCustomizer(cookie -> cookie
                .httpOnly(true)
                .secure(csrfProperties.isSecureCookie())
                .sameSite(csrfProperties.getSameSite()));
        return new RequestCachingCsrfTokenRepository(repository);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(new ArrayList<>(corsProperties.getAllowedOrigins()));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                CorrelationIdFilter.HEADER_NAME,
                "X-XSRF-TOKEN"));
        configuration.setExposedHeaders(Arrays.asList("X-XSRF-TOKEN", CorrelationIdFilter.HEADER_NAME));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
