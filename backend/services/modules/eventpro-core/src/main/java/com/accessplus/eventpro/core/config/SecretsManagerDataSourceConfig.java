package com.accessplus.eventpro.core.config;

import com.accessplus.eventpro.shared.util.DatabaseSecretParser;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.SecretsManagerException;

import javax.sql.DataSource;

@Configuration
@Profile("!local")
public class SecretsManagerDataSourceConfig {

    private static final Logger LOG = LoggerFactory.getLogger(SecretsManagerDataSourceConfig.class);

    @Autowired
    private AwsProperties awsProperties;

    @Autowired(required = false)
    private SecretsManagerClient secretsManagerClient;

    private HikariDataSource dataSource;

    @Bean
    @Primary
    public DataSource dataSource() {
        String dbHost = getEnvVar("DB_HOST", "localhost");
        String dbPort = getEnvVar("DB_PORT", "5432");
        String dbName = getEnvVar("DB_NAME", "eventpro");
        String secretArn = awsProperties.getSecretsManager().getSecretArn();

        if (secretArn == null || secretArn.isEmpty()) {
            throw new IllegalStateException("aws.secrets-manager.secret-arn must be configured for non-local profiles");
        }

        LOG.info("Configuring DataSource for non-local environment");
        LOG.info("DB_HOST: {}, DB_PORT: {}, DB_NAME: {}", dbHost, dbPort, dbName);
        LOG.info("Fetching credentials from Secrets Manager: {}", secretArn);

        // Use injected SecretsManagerClient bean if available, otherwise create one
        // This supports LocalStack endpoint override via SecretsManagerConfig
        SecretsManagerClient client = secretsManagerClient;
        boolean shouldCloseClient = false;
        
        if (client == null) {
            // Fallback: create client if bean not available (shouldn't happen in non-local profiles)
            LOG.warn("SecretsManagerClient bean not found, creating new instance");
            String awsRegion = getEnvVar("AWS_REGION", "us-east-1");
            client = SecretsManagerClient.builder()
                    .region(Region.of(awsRegion))
                    .credentialsProvider(DefaultCredentialsProvider.builder().build())
                    .build();
            shouldCloseClient = true;
        }

        // Fetch credentials from Secrets Manager
        DatabaseSecretParser.DatabaseCredentials credentials;
        try {
            GetSecretValueRequest request = GetSecretValueRequest.builder()
                    .secretId(secretArn)
                    .build();

            String secretString = client.getSecretValue(request).secretString();
            credentials = DatabaseSecretParser.parseSecretJson(secretString);
            
            LOG.info("Successfully retrieved database credentials from Secrets Manager");
        } catch (SecretsManagerException e) {
            LOG.error("Failed to retrieve secret from Secrets Manager: {}", secretArn, e);
            if (shouldCloseClient) {
                client.close();
            }
            throw new IllegalStateException("Failed to retrieve database credentials from Secrets Manager", e);
        } catch (Exception e) {
            LOG.error("Failed to parse secret JSON", e);
            if (shouldCloseClient) {
                client.close();
            }
            throw new IllegalStateException("Failed to parse database credentials from secret", e);
        } finally {
            // Only close if we created the client (not if it's a bean)
            if (shouldCloseClient) {
                client.close();
            }
        }

        // Configure HikariCP DataSource
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(String.format("jdbc:postgresql://%s:%s/%s", dbHost, dbPort, dbName));
        config.setUsername(credentials.getUsername());
        config.setPassword(credentials.getPassword());
        
        // Connection pool settings for ECS
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setConnectionTimeout(30000); // 30 seconds
        config.setIdleTimeout(600000); // 10 minutes
        config.setMaxLifetime(1800000); // 30 minutes
        config.setLeakDetectionThreshold(60000); // 1 minute
        
        // Connection validation
        config.setConnectionTestQuery("SELECT 1");
        config.setValidationTimeout(5000); // 5 seconds
        
        // PostgreSQL-specific settings
        config.addDataSourceProperty("cachePrepStmts", "true");
        config.addDataSourceProperty("prepStmtCacheSize", "250");
        config.addDataSourceProperty("prepStmtCacheSqlLimit", "2048");
        config.addDataSourceProperty("useServerPrepStmts", "true");
        config.addDataSourceProperty("useLocalSessionState", "true");
        config.addDataSourceProperty("rewriteBatchedStatements", "true");
        config.addDataSourceProperty("cacheResultSetMetadata", "true");
        config.addDataSourceProperty("cacheServerConfiguration", "true");
        config.addDataSourceProperty("elideSetAutoCommits", "true");
        config.addDataSourceProperty("maintainTimeStats", "false");

        dataSource = new HikariDataSource(config);
        LOG.info("DataSource configured successfully");
        
        return dataSource;
    }

    @PreDestroy
    public void close() {
        if (dataSource != null && !dataSource.isClosed()) {
            LOG.info("Closing DataSource");
            dataSource.close();
        }
    }

    private String getEnvVar(String name, String defaultValue) {
        String value = System.getenv(name);
        return value != null && !value.isEmpty() ? value : defaultValue;
    }
}

