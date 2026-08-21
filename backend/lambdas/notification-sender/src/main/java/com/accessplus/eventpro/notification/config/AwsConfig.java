package com.accessplus.eventpro.notification.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.sns.SnsClient;

import java.net.URI;

@Configuration
public class AwsConfig {
    @Value("${AWS_ENDPOINT_URL:}")
    private String awsEndpointUrl;

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper().findAndRegisterModules();
    }

    @Bean
    public SnsClient snsClient() {
        var builder = SnsClient.builder();
        if (hasEndpoint()) builder.endpointOverride(URI.create(awsEndpointUrl));
        return builder.build();
    }

    @Bean
    public S3Client s3Client() {
        var builder = S3Client.builder().forcePathStyle(hasEndpoint());
        if (hasEndpoint()) builder.endpointOverride(URI.create(awsEndpointUrl));
        return builder.build();
    }

    @Bean
    public SecretsManagerClient secretsManagerClient() {
        var builder = SecretsManagerClient.builder();
        if (hasEndpoint()) builder.endpointOverride(URI.create(awsEndpointUrl));
        return builder.build();
    }

    @Bean
    public DynamoDbClient dynamoDbClient() {
        var builder = DynamoDbClient.builder();
        if (hasEndpoint()) builder.endpointOverride(URI.create(awsEndpointUrl));
        return builder.build();
    }

    private boolean hasEndpoint() { return awsEndpointUrl != null && !awsEndpointUrl.isBlank(); }
}
