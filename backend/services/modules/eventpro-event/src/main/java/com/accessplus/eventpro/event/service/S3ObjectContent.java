package com.accessplus.eventpro.event.service;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class S3ObjectContent {
    private final byte[] content;
    private final String contentType;
}
