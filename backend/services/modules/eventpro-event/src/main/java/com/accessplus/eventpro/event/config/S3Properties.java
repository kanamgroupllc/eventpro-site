package com.accessplus.eventpro.event.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@Getter
public class S3Properties {

    @Value("${aws.s3.bucketName:eventpro-images-local}")
    private String bucketName;

    @Value("${aws.s3.endpoint:${AWS_ENDPOINT_URL:}}")
    private String endpoint;

    @Value("${aws.s3.publicEndpoint:${AWS_S3_PUBLIC_ENDPOINT:}}")
    private String publicEndpoint;

    @Value("${aws.region:us-east-1}")
    private String region;
}
