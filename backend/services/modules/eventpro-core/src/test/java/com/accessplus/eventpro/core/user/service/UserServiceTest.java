package com.accessplus.eventpro.core.user.service;

import com.accessplus.eventpro.shared.exception.ConflictException;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.core.user.service.impl.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService Tests")
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserServiceImpl userService;

    private UserEntity testUser;
    private String testEmail;
    private UUID testUserId;

    @BeforeEach
    void setUp() {
        testEmail = "test@example.com";
        testUserId = UUID.randomUUID();

        testUser = new UserEntity();
        testUser.setId(testUserId);
        testUser.setEmail(testEmail);
        testUser.setPasswordHash("hashed-password");
        testUser.setFirstName("John");
        testUser.setLastName("Doe");
        testUser.setPhoneNumber("+1234567890");
    }

    @Test
    @DisplayName("Should create user successfully")
    void shouldCreateUserSuccessfully() {
        when(userRepository.findByEmailIgnoreCase(testEmail)).thenReturn(Optional.empty());
        when(userRepository.save(any(UserEntity.class))).thenAnswer(invocation -> {
            UserEntity user = invocation.getArgument(0);
            user.setId(testUserId);
            return user;
        });

        UserEntity result = userService.createUser(
                testEmail, "hashed-password", "John", "Doe", "+1234567890", "USER");

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testUserId);
        assertThat(result.getEmail()).isEqualTo(testEmail);
        assertThat(result.getPasswordHash()).isEqualTo("hashed-password");
        assertThat(result.getFirstName()).isEqualTo("John");
        assertThat(result.getLastName()).isEqualTo("Doe");
        assertThat(result.getPhoneNumber()).isEqualTo("+1234567890");

        verify(userRepository).findByEmailIgnoreCase(testEmail);
        verify(userRepository).save(any(UserEntity.class));
    }

    @Test
    @DisplayName("Should throw ConflictException when email already exists")
    void shouldThrowConflictExceptionWhenEmailExists() {
        when(userRepository.findByEmailIgnoreCase(testEmail)).thenReturn(Optional.of(testUser));

        assertThatThrownBy(() -> userService.createUser(
                testEmail, "hashed-password", "John", "Doe", "+1234567890", "USER"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("email")
                .hasMessageContaining(testEmail);

        verify(userRepository).findByEmailIgnoreCase(testEmail);
        verify(userRepository, never()).save(any(UserEntity.class));
    }

    @Test
    @DisplayName("Should get user by email successfully")
    void shouldGetUserByEmailSuccessfully() {
        when(userRepository.findByEmailIgnoreCase(testEmail)).thenReturn(Optional.of(testUser));

        UserEntity result = userService.getUserByEmail(testEmail);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testUserId);
        assertThat(result.getEmail()).isEqualTo(testEmail);

        verify(userRepository).findByEmailIgnoreCase(testEmail);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when user not found by email")
    void shouldThrowResourceNotFoundExceptionWhenUserNotFoundByEmail() {
        when(userRepository.findByEmailIgnoreCase(testEmail)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getUserByEmail(testEmail))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("User")
                .hasMessageContaining(testEmail);

        verify(userRepository).findByEmailIgnoreCase(testEmail);
    }

    @Test
    @DisplayName("Should update user profile by UUID successfully")
    void shouldUpdateUserProfileByUuidSuccessfully() {
        when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserEntity result = userService.updateUserProfile(
                testUserId, "Jane", "Smith", "+9876543210");

        assertThat(result).isNotNull();
        assertThat(result.getFirstName()).isEqualTo("Jane");
        assertThat(result.getLastName()).isEqualTo("Smith");
        assertThat(result.getPhoneNumber()).isEqualTo("+9876543210");

        verify(userRepository).findById(testUserId);
        verify(userRepository).save(any(UserEntity.class));
    }
}
