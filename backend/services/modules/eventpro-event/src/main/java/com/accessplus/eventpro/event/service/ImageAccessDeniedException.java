package com.accessplus.eventpro.event.service;

import java.io.IOException;

/** Thrown when S3 returns 403 Access Denied for an image (e.g. object ACL blocks read). */
public class ImageAccessDeniedException extends IOException {

    public ImageAccessDeniedException(String message) {
        super(message);
    }

    public ImageAccessDeniedException(String message, Throwable cause) {
        super(message, cause);
    }
}
