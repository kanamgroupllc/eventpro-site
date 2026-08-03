package com.accessplus.eventpro.event.config;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class S3ClientConfigTest {

    @Test
    void usesSeparateRuntimeAndBrowserEndpointsForLocalStack() {
        System.setProperty("aws.accessKeyId", "test");
        System.setProperty("aws.secretAccessKey", "test");
        S3Properties properties = properties(
                "http://localhost.localstack.cloud:4566",
                "https://localhost.localstack.cloud:4566"
        );
        S3ClientConfig config = new S3ClientConfig(properties);

        try (S3Client client = config.s3Client(); S3Presigner presigner = config.s3Presigner()) {
            assertThat(client.serviceClientConfiguration().endpointOverride())
                    .contains(URI.create("http://localhost.localstack.cloud:4566"));
            String presignedUrl = presigner.presignGetObject(request -> request
                            .signatureDuration(Duration.ofMinutes(5))
                            .getObjectRequest(GetObjectRequest.builder()
                                    .bucket("eventpro-images-test")
                                    .key("events/test.png")
                                    .build()))
                    .url()
                    .toString();
            assertThat(presignedUrl).startsWith("https://localhost.localstack.cloud:4566/eventpro-images-test/events/test.png");
        } finally {
            System.clearProperty("aws.accessKeyId");
            System.clearProperty("aws.secretAccessKey");
        }
    }

    @Test
    void leavesAwsEndpointsUnsetWhenNoOverrideIsConfigured() {
        S3ClientConfig config = new S3ClientConfig(properties("", ""));

        try (S3Client client = config.s3Client(); S3Presigner presigner = config.s3Presigner()) {
            assertThat(client.serviceClientConfiguration().endpointOverride()).isEmpty();
            assertThat(presigner).isNotNull();
        }
    }

    private static S3Properties properties(String endpoint, String publicEndpoint) {
        S3Properties properties = new S3Properties();
        ReflectionTestUtils.setField(properties, "endpoint", endpoint);
        ReflectionTestUtils.setField(properties, "publicEndpoint", publicEndpoint);
        ReflectionTestUtils.setField(properties, "region", "us-east-1");
        ReflectionTestUtils.setField(properties, "bucketName", "eventpro-images-test");
        return properties;
    }
}
