package com.accessplus.eventpro.api.apikey;

import com.accessplus.eventpro.api.apikey.service.ApiKeyService;
import com.accessplus.eventpro.core.security.CsrfRequestAttributes;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ApiKeyAuthenticationFilterTest {

    private final ApiKeyService apiKeyService = mock(ApiKeyService.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final ApiKeyAuthenticationFilter filter = new ApiKeyAuthenticationFilter(apiKeyService, userRepository);

    @Test
    void marksOnlySuccessfullyAuthenticatedApiKeyRequests() throws Exception {
        UUID userId = UUID.randomUUID();
        UserEntity user = new UserEntity();
        user.setId(userId);
        user.setRole("ORGANIZER");
        when(apiKeyService.resolveUserIdFromKey("valid-key")).thenReturn(Optional.of(userId));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/events");
        request.addHeader("X-Api-Key", "valid-key");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(request.getAttribute(CsrfRequestAttributes.API_KEY_AUTHENTICATED)).isEqualTo(Boolean.TRUE);
        verify(chain).doFilter(request, response);
    }

    @Test
    void invalidApiKeyDoesNotSetExemptionMarker() throws Exception {
        when(apiKeyService.resolveUserIdFromKey("invalid-key")).thenReturn(Optional.empty());
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/events");
        request.addHeader("X-Api-Key", "invalid-key");

        filter.doFilter(request, new MockHttpServletResponse(), mock(FilterChain.class));

        assertThat(request.getAttribute(CsrfRequestAttributes.API_KEY_AUTHENTICATED)).isNull();
    }
}
