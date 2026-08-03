package com.accessplus.eventpro.api.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.Components;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI/Swagger configuration for API documentation.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI eventProOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("KanamEvents Platform API")
                        .description("REST API for KanamEvents event ticketing platform")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("KanamEvents Team"))
                        .license(new License()
                                .name("Proprietary")))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT access token")));
                // Note: Security requirement is NOT applied globally
                // Controllers should use @SecurityRequirement annotation per endpoint
                // Public endpoints (e.g., /actuator/health, /api/v1/events) don't require auth
    }
}
