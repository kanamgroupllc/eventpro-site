package com.accessplus.eventpro.event.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.S3Exception;

/**
 * When running with profile=local (LocalStack), ensures the S3 bucket exists at startup.
 * Creates it if missing so you don't get "The specified bucket does not exist" without running Terraform.
 */
@Slf4j
@Component
@Profile("local")
@Order(0)
@RequiredArgsConstructor
public class LocalStackS3BucketInitializer implements ApplicationRunner {

    private final S3Client s3Client;
    private final S3Properties s3Properties;

    @Override
    public void run(ApplicationArguments args) {
        String bucketName = s3Properties.getBucketName();
        if (bucketName == null || bucketName.isBlank()) {
            log.warn("S3 bucket name is not set; skipping bucket initializer");
            return;
        }
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
            log.debug("S3 bucket already exists: {}", bucketName);
        } catch (NoSuchBucketException e) {
            try {
                s3Client.createBucket(CreateBucketRequest.builder().bucket(bucketName).build());
                log.info("Created S3 bucket for local development: {}", bucketName);
            } catch (S3Exception createEx) {
                log.error("Failed to create S3 bucket {}: {}", bucketName, createEx.getMessage());
                throw createEx;
            }
        } catch (S3Exception e) {
            log.warn("Could not check/create S3 bucket {}: {} (is LocalStack running?)", bucketName, e.getMessage());
        }
    }
}
