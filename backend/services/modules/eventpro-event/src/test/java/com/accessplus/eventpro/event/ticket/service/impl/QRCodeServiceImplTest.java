package com.accessplus.eventpro.event.ticket.service.impl;

import com.accessplus.eventpro.event.config.S3Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ServiceClientConfiguration;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;

import java.io.IOException;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QRCodeServiceImplTest {

    private static final String BUCKET_NAME = "test-bucket";

    @Mock
    private S3Client s3Client;

    @Mock
    private S3Properties s3Properties;

    @InjectMocks
    private QRCodeServiceImpl qrCodeService;

    @BeforeEach
    void setUp() {
        when(s3Properties.getBucketName()).thenReturn(BUCKET_NAME);
        when(s3Properties.getEndpoint()).thenReturn("");
        when(s3Properties.getPublicEndpoint()).thenReturn("");
        when(s3Client.serviceClientConfiguration()).thenReturn(
                S3ServiceClientConfiguration.builder()
                        .region(Region.US_EAST_1)
                        .build()
        );
    }

    @Test
    void uploadQRCodeToS3DoesNotSetObjectAcl() throws IOException {
        UUID ticketId = UUID.randomUUID();
        byte[] qrCodeImage = new byte[] {1, 2, 3};
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        String result = qrCodeService.uploadQRCodeToS3(qrCodeImage, ticketId);

        assertTrue(result.contains("qr-codes/" + ticketId + ".png"));
        var requestCaptor = forClass(PutObjectRequest.class);
        verify(s3Client).putObject(requestCaptor.capture(), any(RequestBody.class));
        PutObjectRequest putObjectRequest = requestCaptor.getValue();
        assertEquals(BUCKET_NAME, putObjectRequest.bucket());
        assertEquals("qr-codes/" + ticketId + ".png", putObjectRequest.key());
        assertEquals("image/png", putObjectRequest.contentType());
        assertNull(putObjectRequest.acl());
    }
}
