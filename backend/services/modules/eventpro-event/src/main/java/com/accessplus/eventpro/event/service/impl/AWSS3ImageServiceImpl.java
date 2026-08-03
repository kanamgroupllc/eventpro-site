package com.accessplus.eventpro.event.service.impl;

import com.accessplus.eventpro.event.config.S3Properties;
import com.accessplus.eventpro.event.service.AWSS3ImageService;
import com.accessplus.eventpro.event.service.ImageAccessDeniedException;
import com.accessplus.eventpro.event.service.S3ObjectContent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AWSS3ImageServiceImpl implements AWSS3ImageService {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
    );
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            ".jpg", ".jpeg", ".png", ".webp"
    );

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final S3Properties s3Properties;

    @Override
    public String uploadImage(MultipartFile file, String key) throws IOException {
        log.debug("Uploading image to S3: key={}, size={}", key, file.getSize());

        // Validate image before upload
        validateImage(file);

        // Generate unique key if not provided
        String finalKey = key != null && !key.isEmpty() ? key : generateImageKey(file.getOriginalFilename());

        try {
            // Determine content type
            String contentType = file.getContentType();
            if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
                contentType = determineContentType(file.getOriginalFilename());
            }

            // Read file bytes into memory to avoid stream reset issues with AWS SDK signing
            byte[] fileBytes = file.getBytes();

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(s3Properties.getBucketName())
                    .key(finalKey)
                    .contentType(contentType)
                    .contentLength((long) fileBytes.length)
                    .build();

            // Upload file using bytes (allows AWS SDK to read multiple times for signing)
            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(fileBytes));

            // Generate and return public URL
            String imageUrl = getImageUrl(finalKey);
            log.info("Successfully uploaded image to S3: key={}, url={}", finalKey, imageUrl);
            return imageUrl;

        } catch (S3Exception e) {
            log.error("Failed to upload image to S3: key={}, error={}", finalKey, e.getMessage(), e);
            throw new IOException("Failed to upload image to S3: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteImage(String key) throws IOException {
        if (key == null || key.isEmpty()) {
            log.warn("Attempted to delete image with empty key");
            return;
        }

        log.debug("Deleting image from S3: key={}", key);

        try {
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(s3Properties.getBucketName())
                    .key(key)
                    .build();

            s3Client.deleteObject(deleteObjectRequest);
            log.info("Successfully deleted image from S3: key={}", key);

        } catch (S3Exception e) {
            log.error("Failed to delete image from S3: key={}, error={}", key, e.getMessage(), e);
            throw new IOException("Failed to delete image from S3: " + e.getMessage(), e);
        }
    }

    @Override
    public String getPresignedUrl(String key, int expirationMinutes) {
        if (key == null || key.isEmpty()) {
            throw new IllegalArgumentException("S3 key cannot be null or empty");
        }

        log.debug("Generating presigned URL for image: key={}, expiration={} minutes", key, expirationMinutes);

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(s3Properties.getBucketName())
                .key(key)
                .build();

        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(
                presignerBuilder -> presignerBuilder
                        .signatureDuration(Duration.ofMinutes(expirationMinutes))
                        .getObjectRequest(getObjectRequest)
        );

        return presignedRequest.url().toString();
    }

    @Override
    public String getImageUrl(String key) {
        if (key == null || key.isEmpty()) {
            throw new IllegalArgumentException("S3 key cannot be null or empty");
        }

        // Extract key from full URL if provided
        String actualKey = extractKeyFromUrl(key);

        // Build public URL
        // Format: https://{bucket}.s3.{region}.amazonaws.com/{key}
        // For LocalStack: http://localhost:4566/{bucket}/{key}
        String bucketName = s3Properties.getBucketName();
        String region = s3Properties.getRegion();
        String endpoint = s3Properties.getEndpoint();
        String publicEndpoint = s3Properties.getPublicEndpoint();

        // Use publicEndpoint if configured (for frontend-accessible URLs), otherwise use endpoint
        String urlEndpoint = (publicEndpoint != null && !publicEndpoint.isEmpty()) 
                ? publicEndpoint 
                : endpoint;

        if (urlEndpoint != null && !urlEndpoint.isEmpty()) {
            // LocalStack format: http://localhost:4566/{bucket}/{key}
            return String.format("%s/%s/%s", urlEndpoint, bucketName, actualKey);
        } else {
            // AWS format: https://{bucket}.s3.{region}.amazonaws.com/{key}
            return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, actualKey);
        }
    }

    @Override
    public S3ObjectContent getObject(String key) throws IOException {
        if (key == null || key.isEmpty()) {
            throw new IllegalArgumentException("S3 key cannot be null or empty");
        }
        String actualKey = extractKeyFromUrl(key);
        String bucketName = s3Properties.getBucketName();
        log.debug("S3 getObject: bucket={}, key={}", bucketName, actualKey);
        try {
            GetObjectRequest req = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(actualKey)
                    .build();
            try (ResponseInputStream<GetObjectResponse> stream = s3Client.getObject(req)) {
                GetObjectResponse response = stream.response();
                String contentType = response.contentType() != null ? response.contentType() : determineContentType(actualKey);
                byte[] content = stream.readAllBytes();
                return new S3ObjectContent(content, contentType);
            }
        } catch (NoSuchKeyException e) {
            log.warn("S3 object not found: {}", actualKey);
            throw new IOException("Image not found: " + actualKey, e);
        } catch (S3Exception e) {
            boolean accessDenied = e.statusCode() == 403
                    || (e.awsErrorDetails() != null
                    && (e.awsErrorDetails().errorCode() != null
                    && (e.awsErrorDetails().errorCode().contains("AccessDenied")
                    || e.awsErrorDetails().errorCode().contains("Forbidden"))));
            if (accessDenied) {
                log.warn("S3 access denied for key={}: {}", actualKey, e.getMessage());
                throw new ImageAccessDeniedException("Access denied: " + actualKey, e);
            }
            log.error("Failed to get S3 object: key={}, error={}", actualKey, e.getMessage(), e);
            throw new IOException("Failed to get image from S3: " + e.getMessage(), e);
        }
    }

    @Override
    public void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file cannot be null or empty");
        }

        // Check file size
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException(
                    String.format("Image file size exceeds maximum allowed size of %d MB", MAX_FILE_SIZE / (1024 * 1024))
            );
        }

        // Check content type
        String contentType = file.getContentType();
        if (contentType != null && !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException(
                    String.format("Image content type '%s' is not allowed. Allowed types: %s", contentType, ALLOWED_CONTENT_TYPES)
            );
        }

        // Check file extension
        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null) {
            String extension = getFileExtension(originalFilename).toLowerCase();
            if (!ALLOWED_EXTENSIONS.contains(extension)) {
                throw new IllegalArgumentException(
                        String.format("Image file extension '%s' is not allowed. Allowed extensions: %s", extension, ALLOWED_EXTENSIONS)
                );
            }
        } else if (contentType == null) {
            // If no filename and no content type, we can't validate
            throw new IllegalArgumentException("Cannot validate image: missing filename and content type");
        }
    }

    private String generateImageKey(String originalFilename) {
        String uuid = UUID.randomUUID().toString();
        String filename = originalFilename != null ? originalFilename : "image";
        String extension = getFileExtension(filename);
        return String.format("events/%s%s", uuid, extension);
    }

    private String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) {
            return "";
        }
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1 || lastDotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(lastDotIndex);
    }

    private String determineContentType(String filename) {
        if (filename == null) {
            return "image/jpeg";
        }
        String extension = getFileExtension(filename).toLowerCase();
        return switch (extension) {
            case ".jpg", ".jpeg" -> "image/jpeg";
            case ".png" -> "image/png";
            case ".webp" -> "image/webp";
            default -> "image/jpeg";
        };
    }

    private String extractKeyFromUrl(String urlOrKey) {
        // Strip query string so ?... is never part of the key
        String input = urlOrKey;
        int queryStart = urlOrKey.indexOf('?');
        if (queryStart > 0) {
            input = urlOrKey.substring(0, queryStart);
        }
        // If it's already a key (no http/https), return as-is
        if (!input.startsWith("http://") && !input.startsWith("https://")) {
            return input;
        }

        // Extract key from URL
        // Format: https://{bucket}.s3.{region}.amazonaws.com/{key}
        // or: http://localhost:4566/{bucket}/{key} (LocalStack path-style)
        try {
            String bucketName = s3Properties.getBucketName();
            if (input.contains("/" + bucketName + "/")) {
                int idx = input.indexOf("/" + bucketName + "/");
                int keyStartIndex = idx + 1 + bucketName.length() + 1; // skip "/bucket/"
                if (keyStartIndex <= input.length()) {
                    return input.substring(keyStartIndex);
                }
            }
            // LocalStack path-style fallback: path is /bucket/key - take everything after first path segment (bucket)
            if (input.contains(":4566/")) {
                int pathStart = input.indexOf(":4566/") + 6; // after ":4566/"
                String path = input.substring(pathStart);
                int firstSlash = path.indexOf('/');
                if (firstSlash >= 0 && firstSlash < path.length() - 1) {
                    return path.substring(firstSlash + 1); // key after bucket name
                }
            }
            if (input.contains(".s3.")) {
                // AWS format: https://bucket.s3.region.amazonaws.com/key
                int keyStartIndex = input.indexOf(".s3.") + 4;
                keyStartIndex = input.indexOf("/", keyStartIndex) + 1;
                return input.substring(keyStartIndex);
            }
        } catch (Exception e) {
            log.warn("Failed to extract key from URL: {}, using as-is", urlOrKey, e);
        }

        return input;
    }
}
