package com.accessplus.eventpro.event.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface AWSS3ImageService {

    String uploadImage(MultipartFile file, String key) throws IOException;

    void deleteImage(String key) throws IOException;

    String getPresignedUrl(String key, int expirationMinutes);

    String getImageUrl(String key);

    void validateImage(MultipartFile file);

    /**
     * Fetch object bytes from S3 (e.g. for proxying to browser when direct S3 access returns 403).
     * @return content and content type, or null if key not found
     */
    S3ObjectContent getObject(String key) throws IOException;
}

