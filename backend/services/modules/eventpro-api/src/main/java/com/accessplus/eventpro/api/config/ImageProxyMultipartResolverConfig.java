package com.accessplus.eventpro.api.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.multipart.MultipartResolver;
import org.springframework.web.multipart.support.StandardServletMultipartResolver;

/**
 * Provides a MultipartResolver that never treats GET requests to the image proxy
 * as multipart, avoiding MultipartException when the proxy is hit.
 */
@Configuration
public class ImageProxyMultipartResolverConfig {

    private static final String IMAGE_PROXY_PATH = "/api/v1/images/proxy";

    @Bean(name = "multipartResolver")
    public MultipartResolver multipartResolver() {
        return new StandardServletMultipartResolver() {
            @Override
            public boolean isMultipart(HttpServletRequest request) {
                if (request == null) {
                    return false;
                }
                String method = request.getMethod();
                String uri = request.getRequestURI();
                if ("GET".equalsIgnoreCase(method) && uri != null && uri.contains("images/proxy")) {
                    return false;
                }
                return super.isMultipart(request);
            }
        };
    }
}
