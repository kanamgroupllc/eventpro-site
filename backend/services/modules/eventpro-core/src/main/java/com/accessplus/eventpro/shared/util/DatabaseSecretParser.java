package com.accessplus.eventpro.shared.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectReader;

/**
 * Framework-agnostic utility for parsing RDS-managed Secrets Manager secret JSON.
 * RDS-managed secrets contain only "username" and "password" fields.
 *
 * This utility can be used by both Spring Boot and Quarkus applications
 * after they fetch the secret from AWS Secrets Manager.
 */
public final class DatabaseSecretParser {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final ObjectReader READER = OBJECT_MAPPER.reader();

    private DatabaseSecretParser() {
        // Utility class - prevent instantiation
    }

    /**
     * Parse RDS-managed secret JSON string to extract username and password.
     *
     * @param secretJson The JSON string from Secrets Manager (format: {"username": "...", "password": "..."})
     * @return DatabaseCredentials containing username and password
     * @throws IllegalArgumentException if secretJson is null, empty, or invalid
     */
    public static DatabaseCredentials parseSecretJson(String secretJson) {
        if (secretJson == null || secretJson.trim().isEmpty()) {
            throw new IllegalArgumentException("Secret JSON cannot be null or empty");
        }

        try {
            JsonNode jsonNode = READER.readTree(secretJson);

            String username = getRequiredField(jsonNode, "username");
            String password = getRequiredField(jsonNode, "password");

            return new DatabaseCredentials(username, password);
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse secret JSON: " + e.getMessage(), e);
        }
    }

    private static String getRequiredField(JsonNode jsonNode, String fieldName) {
        JsonNode field = jsonNode.get(fieldName);
        if (field == null || field.isNull() || !field.isTextual()) {
            throw new IllegalArgumentException("Secret JSON missing required field: " + fieldName);
        }
        String value = field.asText();
        if (value.isEmpty()) {
            throw new IllegalArgumentException("Secret JSON field '" + fieldName + "' cannot be empty");
        }
        return value;
    }

    /**
     * Container for database credentials parsed from RDS-managed secret.
     */
    public static class DatabaseCredentials {
        private final String username;
        private final String password;

        private DatabaseCredentials(String username, String password) {
            this.username = username;
            this.password = password;
        }

        public String getUsername() {
            return username;
        }

        public String getPassword() {
            return password;
        }
    }
}
