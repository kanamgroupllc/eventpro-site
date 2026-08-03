package com.accessplus.eventpro.event.service.impl;

import com.accessplus.eventpro.event.config.S3Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import java.util.function.Consumer;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URL;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.Mockito.*;

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

/**
 * Unit tests for AWSS3ImageServiceImpl.
 * Tests image validation, upload, delete, and URL generation functionality.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AWSS3ImageServiceImplTest {

    @Mock
    private S3Client s3Client;

    @Mock
    private S3Presigner s3Presigner;

    @Mock
    private S3Properties s3Properties;

    @InjectMocks
    private AWSS3ImageServiceImpl imageService;

    private static final String BUCKET_NAME = "test-bucket";
    private static final String TEST_KEY = "events/test-image.jpg";

    @BeforeEach
    void setUp() {
        when(s3Properties.getBucketName()).thenReturn(BUCKET_NAME);
        when(s3Properties.getEndpoint()).thenReturn("");
        when(s3Properties.getRegion()).thenReturn("us-east-1");
    }

    @Test
    void testValidateImage_ValidJpeg() {
        MultipartFile file = createMockFile("test.jpg", "image/jpeg", 1024);
        assertDoesNotThrow(() -> imageService.validateImage(file));
    }

    @Test
    void testValidateImage_ValidPng() {
        MultipartFile file = createMockFile("test.png", "image/png", 2048);
        assertDoesNotThrow(() -> imageService.validateImage(file));
    }

    @Test
    void testValidateImage_ValidWebp() {
        MultipartFile file = createMockFile("test.webp", "image/webp", 3072);
        assertDoesNotThrow(() -> imageService.validateImage(file));
    }

    @Test
    void testValidateImage_NullFile() {
        assertThrows(IllegalArgumentException.class, () -> imageService.validateImage(null));
    }

    @Test
    void testValidateImage_EmptyFile() {
        MultipartFile file = createMockFile("test.jpg", "image/jpeg", 0);
        assertThrows(IllegalArgumentException.class, () -> imageService.validateImage(file));
    }

    @Test
    void testValidateImage_FileTooLarge() {
        MultipartFile file = createMockFile("test.jpg", "image/jpeg", 11 * 1024 * 1024); // 11 MB
        assertThrows(IllegalArgumentException.class, () -> imageService.validateImage(file));
    }

    @Test
    void testValidateImage_InvalidContentType() {
        MultipartFile file = createMockFile("test.pdf", "application/pdf", 1024);
        assertThrows(IllegalArgumentException.class, () -> imageService.validateImage(file));
    }

    @Test
    void testValidateImage_InvalidExtension() {
        MultipartFile file = createMockFile("test.gif", "image/gif", 1024);
        assertThrows(IllegalArgumentException.class, () -> imageService.validateImage(file));
    }

    @Test
    void testUploadImage_Success() throws IOException {
        MultipartFile file = createMockFile("test.jpg", "image/jpeg", 1024);
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        String result = imageService.uploadImage(file, TEST_KEY);

        assertNotNull(result);
        assertTrue(result.contains(TEST_KEY));
        var requestCaptor = forClass(PutObjectRequest.class);
        verify(s3Client, times(1)).putObject(requestCaptor.capture(), any(RequestBody.class));
        PutObjectRequest putObjectRequest = requestCaptor.getValue();
        assertEquals(BUCKET_NAME, putObjectRequest.bucket());
        assertEquals(TEST_KEY, putObjectRequest.key());
        assertEquals("image/jpeg", putObjectRequest.contentType());
        assertNull(putObjectRequest.acl());
    }

    @Test
    void testUploadImage_WithGeneratedKey() throws IOException {
        MultipartFile file = createMockFile("test.jpg", "image/jpeg", 1024);
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        String result = imageService.uploadImage(file, null);

        assertNotNull(result);
        assertTrue(result.contains("events/"));
        verify(s3Client, times(1)).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    void testUploadImage_S3Exception() throws IOException {
        MultipartFile file = createMockFile("test.jpg", "image/jpeg", 1024);
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(S3Exception.builder().message("S3 error").build());

        assertThrows(IOException.class, () -> imageService.uploadImage(file, TEST_KEY));
    }

    @Test
    void testDeleteImage_Success() throws IOException {
        when(s3Client.deleteObject(any(DeleteObjectRequest.class)))
                .thenReturn(DeleteObjectResponse.builder().build());

        imageService.deleteImage(TEST_KEY);

        verify(s3Client, times(1)).deleteObject(any(DeleteObjectRequest.class));
    }

    @Test
    void testDeleteImage_EmptyKey() throws IOException {
        imageService.deleteImage("");
        verify(s3Client, never()).deleteObject(any(DeleteObjectRequest.class));
    }

    @Test
    void testDeleteImage_NullKey() throws IOException {
        imageService.deleteImage(null);
        verify(s3Client, never()).deleteObject(any(DeleteObjectRequest.class));
    }

    @Test
    void testDeleteImage_S3Exception() {
        when(s3Client.deleteObject(any(DeleteObjectRequest.class)))
                .thenThrow(S3Exception.builder().message("S3 error").build());

        assertThrows(IOException.class, () -> imageService.deleteImage(TEST_KEY));
    }

    @Test
    void testGetImageUrl_Success() {
        // Mock the service client configuration
        software.amazon.awssdk.services.s3.S3ServiceClientConfiguration s3Config = 
                software.amazon.awssdk.services.s3.S3ServiceClientConfiguration.builder()
                        .region(software.amazon.awssdk.regions.Region.US_EAST_1)
                        .build();
        when(s3Client.serviceClientConfiguration()).thenReturn(s3Config);
        
        String result = imageService.getImageUrl(TEST_KEY);

        assertNotNull(result);
        assertTrue(result.contains(BUCKET_NAME));
        assertTrue(result.contains(TEST_KEY));
    }

    @Test
    void testGetImageUrl_EmptyKey() {
        assertThrows(IllegalArgumentException.class, () -> imageService.getImageUrl(""));
    }

    @Test
    void testGetImageUrl_NullKey() {
        assertThrows(IllegalArgumentException.class, () -> imageService.getImageUrl(null));
    }

    @Test
    void testGetPresignedUrl_Success() throws Exception {
        PresignedGetObjectRequest presignedRequest = mock(PresignedGetObjectRequest.class);
        URL mockUrl = new java.net.URI("https://test-bucket.s3.us-east-1.amazonaws.com/events/test-image.jpg?signature=test").toURL();
        when(presignedRequest.url()).thenReturn(mockUrl);
        when(s3Presigner.presignGetObject(org.mockito.ArgumentMatchers.<Consumer<GetObjectPresignRequest.Builder>>any())).thenReturn(presignedRequest);

        String result = imageService.getPresignedUrl(TEST_KEY, 60);

        assertNotNull(result);
        assertTrue(result.contains(TEST_KEY));
        verify(s3Presigner, times(1)).presignGetObject(org.mockito.ArgumentMatchers.<Consumer<GetObjectPresignRequest.Builder>>any());
    }

    @Test
    void testGetPresignedUrl_EmptyKey() {
        // No stubbing needed for this test
        assertThrows(IllegalArgumentException.class, () -> imageService.getPresignedUrl("", 60));
    }

    @Test
    void testGetPresignedUrl_NullKey() {
        // No stubbing needed for this test
        assertThrows(IllegalArgumentException.class, () -> imageService.getPresignedUrl(null, 60));
    }

    // Helper method to create mock MultipartFile
    private MultipartFile createMockFile(String filename, String contentType, long size) {
        MultipartFile file = mock(MultipartFile.class);
        byte[] bytes = new byte[(int) size];
        when(file.getOriginalFilename()).thenReturn(filename);
        when(file.getContentType()).thenReturn(contentType);
        when(file.getSize()).thenReturn(size);
        when(file.isEmpty()).thenReturn(size == 0);
        try {
            byte[] content = new byte[(int) size];
            when(file.getBytes()).thenReturn(content);
            when(file.getInputStream()).thenReturn(new ByteArrayInputStream(content));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        return file;
    }
}
