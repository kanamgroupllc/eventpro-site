package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.dto.AuthLoginRequest;
import com.accessplus.eventpro.api.security.RecaptchaVerificationService;
import com.accessplus.eventpro.api.service.AuthResult;
import com.accessplus.eventpro.api.service.AuthService;
import com.accessplus.eventpro.core.email.service.EmailService;
import com.accessplus.eventpro.core.security.CsrfTokenService;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.web.csrf.DefaultCsrfToken;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerCsrfTest {

    @Mock
    private EmailService emailService;

    @Mock
    private AuthService authService;

    @Mock
    private RecaptchaVerificationService recaptchaVerificationService;

    @Mock
    private CsrfTokenService csrfTokenService;

    @InjectMocks
    private AuthController controller;

    @Test
    void successfulLoginRotatesTokenCookieAndReturnsNewHeader() {
        AuthLoginRequest login = new AuthLoginRequest();
        login.setEmail("user@example.com");
        login.setPassword("password");
        UserEntity user = new UserEntity();
        user.setEmail("user@example.com");
        user.setFirstName("Event");
        user.setLastName("User");
        user.setRole("USER");
        when(authService.login(login)).thenReturn(new AuthResult("jwt", 3600, user));
        var rotated = new DefaultCsrfToken("X-XSRF-TOKEN", "_csrf", "rotated-token");
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(csrfTokenService.rotate(request, response)).thenReturn(rotated);

        controller.login(login, request, response);

        assertThat(response.getHeader("X-XSRF-TOKEN")).isEqualTo("rotated-token");
        verify(csrfTokenService).rotate(request, response);
    }
}
