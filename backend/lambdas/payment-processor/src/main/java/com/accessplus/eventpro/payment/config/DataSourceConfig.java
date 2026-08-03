package com.accessplus.eventpro.payment.config;

import com.accessplus.eventpro.shared.util.DatabaseSecretParser;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.SecretsManagerException;

import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    private static final Logger LOG = LoggerFactory.getLogger(DataSourceConfig.class);

    @Value("${DB_SECRET_ARN:}")
    private String dbSecretArn;

    @Value("${DB_USERNAME:eventpro}")
    private String dbUsername;

    @Value("${DB_PASSWORD:eventpro}")
    private String dbPassword;

    @Value("${DB_URL:}")
    private String dbUrlProperty;

    @Bean
    @Primary
    public DataSource dataSource(SecretsManagerClient secretsManagerClient) {
        String url = buildJdbcUrl();
        String username = dbUsername;
        String password = dbPassword;

        if (dbSecretArn != null && !dbSecretArn.isEmpty()) {
            try {
                LOG.info("Loading database credentials from Secrets Manager: {}", dbSecretArn);
                var request = GetSecretValueRequest.builder().secretId(dbSecretArn).build();
                String secretString = secretsManagerClient.getSecretValue(request).secretString();
                var creds = DatabaseSecretParser.parseSecretJson(secretString);
                username = creds.getUsername();
                password = creds.getPassword();
                LOG.info("Database credentials loaded from Secrets Manager");
            } catch (SecretsManagerException e) {
                LOG.error("Failed to load database credentials from Secrets Manager: {}", dbSecretArn, e);
                throw new RuntimeException("Cannot initialize database credentials from Secrets Manager", e);
            } catch (Exception e) {
                LOG.error("Failed to parse database secret JSON", e);
                throw new RuntimeException("Cannot parse database credentials from secret", e);
            }
        } else {
            LOG.info("Using environment variables for database credentials (local development)");
        }

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(url);
        config.setUsername(username);
        config.setPassword(password);
        config.setMaximumPoolSize(5);
        config.setMinimumIdle(1);
        return new HikariDataSource(config);
    }

    private String buildJdbcUrl() {
        if (dbUrlProperty != null && !dbUrlProperty.isEmpty()) {
            return dbUrlProperty;
        }
        String dbUrl = System.getenv("DB_URL");
        if (dbUrl != null && !dbUrl.isEmpty()) {
            return dbUrl;
        }
        String dbHost = System.getenv("DB_HOST");
        String dbPort = System.getenv("DB_PORT");
        String dbName = System.getenv("DB_NAME");
        if (dbHost != null && dbPort != null && dbName != null) {
            return String.format("jdbc:postgresql://%s:%s/%s", dbHost, dbPort, dbName);
        }
        return "jdbc:postgresql://localhost:5432/eventpro";
    }
}
