package com.accessplus.eventpro.core.security;

import com.accessplus.eventpro.core.config.CorsProperties;
import com.accessplus.eventpro.core.config.EventProApiSecurityProperties;
import com.accessplus.eventpro.core.config.EventProCsrfProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.hamcrest.Matchers.not;

@SpringJUnitConfig(classes = {
        SecurityConfigCsrfTest.TestConfiguration.class,
        SecurityConfig.class,
        CsrfTokenService.class,
        RestAccessDeniedHandler.class
})
@WebAppConfiguration
class SecurityConfigCsrfTest {

    @Autowired
    private WebApplicationContext applicationContext;

    @Autowired
    private ObjectMapper objectMapper;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(applicationContext)
                .apply(springSecurity())
                .build();
    }

    @Test
    void tokenEndpointReturnsOneRawHttpOnlyCookieThatValidatesAsHeader() throws Exception {
        var tokenResult = mockMvc.perform(get("/api/v1/csrf"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode tokenBody = objectMapper.readTree(tokenResult.getResponse().getContentAsString());
        String headerName = tokenBody.get("headerName").asText();
        String token = tokenBody.get("token").asText();
        Cookie cookie = tokenResult.getResponse().getCookie("XSRF-TOKEN");

        assertThat(cookie).isNotNull();
        assertThat(cookie.getValue()).isEqualTo(token);
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getSecure()).isFalse();
        assertThat(cookie.getPath()).isEqualTo("/");
        assertThat(cookie.getAttribute("SameSite")).isEqualTo("Strict");
        assertThat(tokenResult.getResponse().getHeaders("Set-Cookie")).hasSize(1);

        var loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .cookie(cookie)
                        .header(headerName, token))
                .andExpect(status().isOk())
                .andReturn();

        Cookie rotatedCookie = loginResult.getResponse().getCookie("XSRF-TOKEN");
        assertThat(rotatedCookie).isNotNull();
        assertThat(rotatedCookie.getValue()).isNotEqualTo(token);
        assertThat(loginResult.getResponse().getHeader("X-XSRF-TOKEN"))
                .isEqualTo(rotatedCookie.getValue());
    }

    @Test
    void safeRequestsWithoutCookieDoNotGenerateCompetingTokens() throws Exception {
        var first = mockMvc.perform(get("/api/v1/events"))
                .andExpect(status().isOk())
                .andReturn();
        var second = mockMvc.perform(get("/api/v1/events"))
                .andExpect(status().isOk())
                .andReturn();

        assertThat(first.getResponse().getHeaders("Set-Cookie")).isEmpty();
        assertThat(second.getResponse().getHeaders("Set-Cookie")).isEmpty();
    }

    @Test
    void unsafeRequestWithoutTokenReturnsStructuredMissingError() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .header("Origin", "http://localhost:5173"))
                .andExpect(status().isForbidden())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"))
                .andExpect(jsonPath("$.code").value("CSRF_TOKEN_MISSING"))
                .andExpect(jsonPath("$.path").value("/api/v1/auth/login"));
    }

    @Test
    void unsafeRequestWithMismatchedTokenReturnsStructuredInvalidError() throws Exception {
        var tokenResult = mockMvc.perform(get("/api/v1/csrf")).andReturn();
        Cookie cookie = tokenResult.getResponse().getCookie("XSRF-TOKEN");

        mockMvc.perform(post("/api/v1/auth/login")
                        .cookie(cookie)
                        .header("X-XSRF-TOKEN", "wrong-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_TOKEN_INVALID"));
    }

    @Test
    void webhookAndMobileRequestsAreExemptButMobileDoesNotBypassAuthorization() throws Exception {
        mockMvc.perform(post("/api/v1/webhooks/stripe"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/login")
                        .header(CsrfRequestAttributes.MOBILE_CLIENT_HEADER,
                                CsrfRequestAttributes.MOBILE_CLIENT_VALUE))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/protected")
                        .header(CsrfRequestAttributes.MOBILE_CLIENT_HEADER,
                                CsrfRequestAttributes.MOBILE_CLIENT_VALUE))
                .andExpect(status().isForbidden());
    }

    @Test
    void authenticatedApiKeyMarkerIsExempt() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .requestAttr(CsrfRequestAttributes.API_KEY_AUTHENTICATED, Boolean.TRUE))
                .andExpect(status().isOk());
    }

    @Test
    void corsAllowsOnlyTheBrowserHeaderContractAndExposesResponseHeaders() throws Exception {
        mockMvc.perform(options("/api/v1/auth/login")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers",
                                "Authorization, Content-Type, X-Correlation-Id, X-XSRF-TOKEN"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"))
                .andExpect(header().string("Access-Control-Allow-Methods", containsStringIgnoringCase("GET")))
                .andExpect(header().string("Access-Control-Allow-Methods", containsStringIgnoringCase("POST")))
                .andExpect(header().string("Access-Control-Allow-Methods", containsStringIgnoringCase("PUT")))
                .andExpect(header().string("Access-Control-Allow-Methods", containsStringIgnoringCase("PATCH")))
                .andExpect(header().string("Access-Control-Allow-Methods", containsStringIgnoringCase("DELETE")))
                .andExpect(header().string("Access-Control-Allow-Headers", containsStringIgnoringCase("Authorization")))
                .andExpect(header().string("Access-Control-Allow-Headers", containsStringIgnoringCase("Content-Type")))
                .andExpect(header().string("Access-Control-Allow-Headers", containsStringIgnoringCase("X-Correlation-Id")))
                .andExpect(header().string("Access-Control-Allow-Headers", containsStringIgnoringCase("X-XSRF-TOKEN")))
                .andExpect(header().string("Access-Control-Allow-Headers", not(containsStringIgnoringCase("X-EventPro-Client"))))
                .andExpect(header().string("Access-Control-Allow-Headers", not(containsStringIgnoringCase("X-Api-Key"))));

        mockMvc.perform(get("/api/v1/csrf")
                        .header("Origin", "http://localhost:5173"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Expose-Headers", containsStringIgnoringCase("X-XSRF-TOKEN")))
                .andExpect(header().string("Access-Control-Expose-Headers", containsStringIgnoringCase("X-Correlation-Id")));
    }

    @Test
    void corsRejectsUntrustedOriginsAndDisallowedBrowserHeaders() throws Exception {
        mockMvc.perform(options("/api/v1/auth/login")
                        .header("Origin", "https://attacker.example")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "X-XSRF-TOKEN"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));

        mockMvc.perform(options("/api/v1/auth/login")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "X-EventPro-Client"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void corsAllowsSafeCorrelationAndMultipartMutationPreflights() throws Exception {
        mockMvc.perform(options("/api/v1/events")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "X-Correlation-Id"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Headers", containsStringIgnoringCase("X-Correlation-Id")));

        mockMvc.perform(options("/api/v1/auth/signup")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "Content-Type, X-Correlation-Id, X-XSRF-TOKEN"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Headers", containsStringIgnoringCase("Content-Type")))
                .andExpect(header().string("Access-Control-Allow-Headers", containsStringIgnoringCase("X-XSRF-TOKEN")));
    }

    @Test
    void multipartMutationAcceptsMatchingCookieAndHeader() throws Exception {
        var tokenResult = mockMvc.perform(get("/api/v1/csrf")).andReturn();
        JsonNode tokenBody = objectMapper.readTree(tokenResult.getResponse().getContentAsString());
        Cookie cookie = tokenResult.getResponse().getCookie("XSRF-TOKEN");

        mockMvc.perform(multipart("/api/v1/auth/signup")
                        .file(new MockMultipartFile("image", "event.png", "image/png", new byte[]{1}))
                        .cookie(cookie)
                        .header(tokenBody.get("headerName").asText(), tokenBody.get("token").asText()))
                .andExpect(status().isOk());
    }

    @Test
    void actuatorIsExemptFromCsrf() throws Exception {
        mockMvc.perform(post("/actuator/health"))
                .andExpect(status().isOk());
    }

    @Configuration
    @EnableWebMvc
    @EnableWebSecurity
    static class TestConfiguration {

        @Bean
        CorsProperties corsProperties() {
            CorsProperties properties = new CorsProperties();
            properties.setAllowedOrigins(List.of("http://localhost:5173"));
            return properties;
        }

        @Bean
        EventProApiSecurityProperties apiSecurityProperties() {
            return new EventProApiSecurityProperties();
        }

        @Bean
        EventProCsrfProperties csrfProperties() {
            EventProCsrfProperties properties = new EventProCsrfProperties();
            properties.setSecureCookie(false);
            return properties;
        }

        @Bean
        JwtService jwtService() {
            return mock(JwtService.class);
        }

        @Bean
        JwtAuthenticationFilter jwtAuthenticationFilter(JwtService jwtService) {
            return new JwtAuthenticationFilter(jwtService);
        }

        @Bean
        ObjectMapper objectMapper() {
            return new ObjectMapper().findAndRegisterModules();
        }

        @Bean
        TestEndpoints testEndpoints(CsrfTokenService csrfTokenService) {
            return new TestEndpoints(csrfTokenService);
        }
    }

    @RestController
    static class TestEndpoints {
        private final CsrfTokenService csrfTokenService;

        TestEndpoints(CsrfTokenService csrfTokenService) {
            this.csrfTokenService = csrfTokenService;
        }

        @GetMapping("/api/v1/csrf")
        Object csrf(HttpServletRequest request, HttpServletResponse response) {
            var token = csrfTokenService.loadOrCreate(request, response);
            return new TokenResponse(token.getHeaderName(), token.getParameterName(), token.getToken());
        }

        @GetMapping("/api/v1/events")
        String events() {
            return "ok";
        }

        @PostMapping("/api/v1/auth/login")
        String login(HttpServletRequest request, HttpServletResponse response) {
            var rotated = csrfTokenService.rotate(request, response);
            response.setHeader(rotated.getHeaderName(), rotated.getToken());
            return "ok";
        }

        @PostMapping(path = "/api/v1/auth/signup", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        String signup() {
            return "ok";
        }

        @PostMapping("/actuator/health")
        String actuator() {
            return "ok";
        }

        @PostMapping({"/api/v1/webhooks/stripe", "/api/v1/protected"})
        String post() {
            return "ok";
        }
    }

    record TokenResponse(String headerName, String parameterName, String token) {
    }
}
