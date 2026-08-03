package com.accessplus.eventpro.event.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

/**
 * Configures native AWS S3 clients when no endpoint is supplied and path-style
 * LocalStack clients when endpoint overrides are present. The runtime client
 * and browser-facing presigner deliberately use separate endpoints.
 */
@Configuration
@RequiredArgsConstructor
public class S3ClientConfig {

    private final S3Properties properties;

    @Bean
    public S3Client s3Client() {
        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(properties.getRegion()))
                .credentialsProvider(DefaultCredentialsProvider.create());

        String endpoint = trimToNull(properties.getEndpoint());
        if (endpoint != null) {
            builder.endpointOverride(URI.create(endpoint))
                    .forcePathStyle(true);
        }
        return builder.build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        S3Presigner.Builder builder = S3Presigner.builder()
                .region(Region.of(properties.getRegion()))
                .credentialsProvider(DefaultCredentialsProvider.create());

        String endpoint = trimToNull(properties.getPublicEndpoint());
        if (endpoint == null) {
            endpoint = trimToNull(properties.getEndpoint());
        }
        if (endpoint != null) {
            builder.endpointOverride(URI.create(endpoint))
                    .serviceConfiguration(S3Configuration.builder()
                            .pathStyleAccessEnabled(true)
                            .build());
        }
        return builder.build();
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
