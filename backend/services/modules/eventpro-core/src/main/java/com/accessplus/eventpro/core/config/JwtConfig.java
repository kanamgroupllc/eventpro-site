package com.accessplus.eventpro.core.config;

import com.accessplus.eventpro.core.security.JwtService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.security.KeyPairGenerator;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Arrays;
import java.util.Base64;

@Slf4j
@Configuration
public class JwtConfig {

    private static final String LOCAL_PROFILE = "local";

    private final JwtProperties jwtProperties;
    private final Environment environment;

    public JwtConfig(JwtProperties jwtProperties, Environment environment) {
        this.jwtProperties = jwtProperties;
        this.environment = environment;
    }

    @Bean
    public PublicKey jwtPublicKey() {
        if (isLocalWithEmptyKeys()) {
            return devKeyPair().getPublic();
        }
        return parsePublicKey(jwtProperties.getPublicKey());
    }

    @Bean
    public PrivateKey jwtPrivateKey() {
        if (isLocalWithEmptyKeys()) {
            return devKeyPair().getPrivate();
        }
        return parsePrivateKey(jwtProperties.getPrivateKey());
    }

    private boolean isLocalWithEmptyKeys() {
        boolean isLocal = Arrays.asList(environment.getActiveProfiles()).contains(LOCAL_PROFILE);
        String pub = jwtProperties.getPublicKey();
        String priv = jwtProperties.getPrivateKey();
        boolean emptyKeys = (pub == null || pub.isBlank()) && (priv == null || priv.isBlank());
        return isLocal && emptyKeys;
    }

    private java.security.KeyPair devKeyPair;

    private java.security.KeyPair devKeyPair() {
        if (devKeyPair == null) {
            try {
                KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
                gen.initialize(2048);
                devKeyPair = gen.generateKeyPair();
                log.warn("JWT keys not set: using in-memory RSA key pair for local development only. Set JWT_PUBLIC_KEY and JWT_PRIVATE_KEY in .env for persistent tokens.");
            } catch (Exception e) {
                throw new IllegalStateException("Failed to generate dev JWT key pair", e);
            }
        }
        return devKeyPair;
    }

    @Bean
    public JwtService jwtService(JwtProperties jwtProperties, PublicKey publicKey, PrivateKey privateKey) {
        return new JwtService(jwtProperties, privateKey, publicKey);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private PublicKey parsePublicKey(String key) {
        try {
            String sanitized = sanitizeKey(key);
            byte[] decoded = Base64.getDecoder().decode(sanitized);
            X509EncodedKeySpec keySpec = new X509EncodedKeySpec(decoded);
            return (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(keySpec);
        } catch (Exception e) {
            log.error("Failed to parse JWT public key", e);
            throw new IllegalStateException("JWT_PUBLIC_KEY is invalid or missing", e);
        }
    }

    private PrivateKey parsePrivateKey(String key) {
        try {
            String sanitized = sanitizeKey(key);
            byte[] decoded = Base64.getDecoder().decode(sanitized);
            PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(decoded);
            return (RSAPrivateKey) KeyFactory.getInstance("RSA").generatePrivate(keySpec);
        } catch (Exception e) {
            log.error("Failed to parse JWT private key", e);
            throw new IllegalStateException("JWT_PRIVATE_KEY is invalid or missing", e);
        }
    }

    private String sanitizeKey(String key) {
        if (key == null || key.trim().isEmpty()) {
            throw new IllegalStateException("JWT keys must be configured");
        }
        return key
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace("-----BEGIN RSA PRIVATE KEY-----", "")
                .replace("-----END RSA PRIVATE KEY-----", "")
                .replaceAll("\\s+", "");
    }
}
