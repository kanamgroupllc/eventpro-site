package com.accessplus.eventpro.core.security;

import io.jsonwebtoken.Claims;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

public class JwtUtils {
    
    public static UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null) {
            throw new IllegalStateException("No valid JWT authentication found: authentication is null");
        }
        
        if (!(authentication instanceof UsernamePasswordAuthenticationToken)) {
            throw new IllegalStateException(
                String.format("No valid JWT authentication found: authentication type is %s, expected UsernamePasswordAuthenticationToken", 
                    authentication.getClass().getName()));
        }
        
        Object principal = authentication.getPrincipal();
        if (principal == null) {
            throw new IllegalStateException("JWT authentication principal is null");
        }
        
        try {
            return UUID.fromString(principal.toString());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("JWT authentication principal is not a valid UUID: " + principal, e);
        }
    }
    
    public static Claims getCurrentJwt() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null) {
            throw new IllegalStateException("No valid JWT authentication found: authentication is null");
        }
        
        if (!(authentication instanceof UsernamePasswordAuthenticationToken)) {
            throw new IllegalStateException(
                String.format("No valid JWT authentication found: authentication type is %s, expected UsernamePasswordAuthenticationToken", 
                    authentication.getClass().getName()));
        }
        
        Object details = authentication.getDetails();
        if (details == null) {
            throw new IllegalStateException("JWT authentication details are null - claims not available");
        }
        
        if (!(details instanceof Claims)) {
            throw new IllegalStateException(
                String.format("JWT authentication details are not Claims: %s", details.getClass().getName()));
        }
        
        return (Claims) details;
    }
    
    public static String getClaim(String claimName) {
        Claims claims = getCurrentJwt();
        Object claim = claims.get(claimName);
        if (claim == null) {
            return null;
        }
        return claim.toString();
    }
}
