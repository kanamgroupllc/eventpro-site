package com.accessplus.eventpro.api.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Ensures GET requests to the image proxy are never treated as multipart,
 * avoiding MultipartException when something in the chain triggers multipart resolution.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ImageProxyNonMultipartFilter extends OncePerRequestFilter {

    private static final String PROXY_PATH_FRAGMENT = "images/proxy";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return !"GET".equalsIgnoreCase(request.getMethod())
                || uri == null
                || !uri.contains(PROXY_PATH_FRAGMENT);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        HttpServletRequest wrapped = new HttpServletRequestWrapper(request) {
            @Override
            public String getContentType() {
                return null;
            }
        };
        filterChain.doFilter(wrapped, response);
    }
}
