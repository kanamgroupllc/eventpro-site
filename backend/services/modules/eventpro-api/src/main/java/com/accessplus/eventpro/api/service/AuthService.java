package com.accessplus.eventpro.api.service;

import com.accessplus.eventpro.api.dto.AuthLoginRequest;
import com.accessplus.eventpro.api.dto.AuthSignupRequest;
import com.accessplus.eventpro.api.dto.CreateAdminUserRequest;
import com.accessplus.eventpro.core.user.entity.UserEntity;

public interface AuthService {
    UserEntity signUp(AuthSignupRequest request);

    AuthResult login(AuthLoginRequest request);

    /**
     * Creates a new user with ADMIN role. Only callable by existing admins.
     */
    UserEntity createAdminUser(CreateAdminUserRequest request);
}
