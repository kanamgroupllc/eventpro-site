package com.accessplus.eventpro.notification.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.SesClientBuilder;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.SnsClientBuilder;

import java.net.URI;

@Configuration
public class AwsConfig {

    private static final Logger LOG = LoggerFactory.getLogger(AwsConfig.class);

    @Value("${AWS_ENDPOINT_URL:}")
    private String awsEndpointUrl;

    @Bean
    public SesClient sesClient() {
        SesClientBuilder builder = SesClient.builder();
        if (awsEndpointUrl != null && !awsEndpointUrl.isEmpty()) {
            builder.endpointOverride(URI.create(awsEndpointUrl));
            LOG.info("SES Client configured with endpoint: {}", awsEndpointUrl);
        }
        return builder.build();
    }

    @Bean
    public SnsClient snsClient() {
        SnsClientBuilder builder = SnsClient.builder();
        if (awsEndpointUrl != null && !awsEndpointUrl.isEmpty()) {
            builder.endpointOverride(URI.create(awsEndpointUrl));
            LOG.info("SNS Client configured with endpoint: {}", awsEndpointUrl);
        }
        return builder.build();
    }
}
