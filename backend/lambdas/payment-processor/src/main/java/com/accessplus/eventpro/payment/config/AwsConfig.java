package com.accessplus.eventpro.payment.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClientBuilder;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.SqsClientBuilder;

import java.net.URI;

@Configuration
public class AwsConfig {

    private static final Logger LOG = LoggerFactory.getLogger(AwsConfig.class);

    @Value("${AWS_ENDPOINT_URL:}")
    private String awsEndpointUrl;

    @Bean
    public SqsClient sqsClient() {
        SqsClientBuilder builder = SqsClient.builder();
        if (awsEndpointUrl != null && !awsEndpointUrl.isEmpty()) {
            builder.endpointOverride(URI.create(awsEndpointUrl));
            LOG.info("SQS Client configured with endpoint: {}", awsEndpointUrl);
        }
        return builder.build();
    }

    @Bean
    public SecretsManagerClient secretsManagerClient() {
        SecretsManagerClientBuilder builder = SecretsManagerClient.builder();
        if (awsEndpointUrl != null && !awsEndpointUrl.isEmpty()) {
            builder.endpointOverride(URI.create(awsEndpointUrl));
            LOG.info("Secrets Manager Client configured with endpoint: {}", awsEndpointUrl);
        }
        return builder.build();
    }
}
