package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.dto.PromoteUserRequest;
import com.accessplus.eventpro.api.dto.UserResponse;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.service.UserService;
import com.accessplus.eventpro.event.service.AWSS3ImageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserController Unit Tests")
class UserControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private AWSS3ImageService imageService;

    @InjectMocks
    private UserController userController;

    private UserEntity testUser;
    private UUID testUserId;

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
        testUser = new UserEntity();
        testUser.setId(testUserId);
        testUser.setEmail("test@example.com");
        testUser.setFirstName("John");
        testUser.setLastName("Doe");
        testUser.setPhoneNumber("+1234567890");
    }

    @Test
    @DisplayName("GET /api/v1/users/{id} - Should return user by ID")
    void shouldGetUserById() {
        when(userService.getUserById(testUserId)).thenReturn(testUser);

        ResponseEntity<com.accessplus.eventpro.api.dto.ApiResponse<UserResponse>> response =
                userController.getUserById(testUserId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData().getId()).isEqualTo(testUserId);

        verify(userService).getUserById(testUserId);
    }

    @Test
    @DisplayName("GET /api/v1/users - Should return paginated users")
    void shouldGetAllUsers() {
        Pageable pageable = PageRequest.of(0, 5, org.springframework.data.domain.Sort.by("email"));
        Page<UserEntity> userPage = new PageImpl<>(List.of(testUser), pageable, 1);

        when(userService.getAllUsers(any(Pageable.class))).thenReturn(userPage);

        ResponseEntity<com.accessplus.eventpro.api.dto.ApiResponse<Page<UserResponse>>> response =
                userController.getAllUsers(1, 5, "email", "asc");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData().getTotalElements()).isEqualTo(1);
        assertThat(response.getBody().getData().getContent()).hasSize(1);

        verify(userService).getAllUsers(any(Pageable.class));
    }

    @Test
    @DisplayName("POST /api/v1/users/admin/users/{userId}/promote - Should promote user to ORGANIZER")
    void shouldPromoteUserToOrganizer() {
        PromoteUserRequest request = PromoteUserRequest.builder()
                .targetRole("ORGANIZER")
                .build();

        ResponseEntity<com.accessplus.eventpro.api.dto.ApiResponse<String>> response =
                userController.promoteUser(testUserId, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getMessage()).isEqualTo("User promoted to ORGANIZER role successfully");

        verify(userService).updateUserRole(testUserId, "ORGANIZER");
    }

    @Test
    @DisplayName("POST /api/v1/users/admin/users/{userId}/promote - Should reject ADMIN role promotion")
    void shouldRejectAdminRolePromotion() {
        PromoteUserRequest request = PromoteUserRequest.builder()
                .targetRole("ADMIN")
                .build();

        assertThatThrownBy(() -> userController.promoteUser(testUserId, request))
                .isInstanceOf(com.accessplus.eventpro.shared.exception.ValidationException.class)
                .hasMessageContaining("ORGANIZER");

        verify(userService, never()).updateUserRole(any(), any());
    }
}
