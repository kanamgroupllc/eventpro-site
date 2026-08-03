package com.accessplus.eventpro.core.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;

import java.net.URI;

@Configuration
@Profile("!local")
public class SecretsManagerConfig {

    @Value("${aws.region:us-east-1}")
    private String awsRegion;

    @Value("${aws.secrets.manager.endpoint:}")
    private String secretsManagerEndpoint; // Optional: for LocalStack

    @Bean
    public SecretsManagerClient secretsManagerClient() {
        var builder = SecretsManagerClient.builder()
                .region(Region.of(awsRegion))
                .credentialsProvider(DefaultCredentialsProvider.builder().build());

        // Configure custom endpoint if provided (for LocalStack)
        if (secretsManagerEndpoint != null && !secretsManagerEndpoint.isEmpty()) {
            builder.endpointOverride(URI.create(secretsManagerEndpoint));
        }

        return builder.build();
    }
}

