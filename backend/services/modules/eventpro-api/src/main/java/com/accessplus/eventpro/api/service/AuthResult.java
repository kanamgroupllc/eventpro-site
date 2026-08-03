package com.accessplus.eventpro.api.service;

import com.accessplus.eventpro.core.user.entity.UserEntity;

public record AuthResult(String accessToken, long expiresIn, UserEntity user) {}
