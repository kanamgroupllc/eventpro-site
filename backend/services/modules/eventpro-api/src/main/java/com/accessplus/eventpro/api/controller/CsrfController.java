package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.dto.CsrfTokenResponse;
import com.accessplus.eventpro.core.security.CsrfTokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/csrf")
@RequiredArgsConstructor
public class CsrfController {

    private final CsrfTokenService csrfTokenService;

    @GetMapping
    public CsrfTokenResponse csrfToken(HttpServletRequest request, HttpServletResponse response) {
        return CsrfTokenResponse.from(csrfTokenService.loadOrCreate(request, response));
    }
}
