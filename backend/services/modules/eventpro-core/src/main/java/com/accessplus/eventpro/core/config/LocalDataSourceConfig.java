package com.accessplus.eventpro.core.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;

@Configuration
@Profile("local")
public class LocalDataSourceConfig {

    private static final Logger LOG = LoggerFactory.getLogger(LocalDataSourceConfig.class);

    private HikariDataSource dataSource;

    @Bean
    @Primary
    public DataSource dataSource() {
        String dbHost = getEnvVar("DB_HOST", "localhost");
        String dbPort = getEnvVar("DB_PORT", "5432");
        String dbName = getEnvVar("DB_NAME", "eventpro");
        String dbUsername = getEnvVar("DB_USERNAME", "eventpro");
        String dbPassword = getEnvVar("DB_PASSWORD", "eventpro");

        LOG.info("Configuring DataSource for local development");
        LOG.info("DB_HOST: {}, DB_PORT: {}, DB_NAME: {}, DB_USERNAME: {}", dbHost, dbPort, dbName, dbUsername);

        // Configure HikariCP DataSource for local development
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(String.format("jdbc:postgresql://%s:%s/%s", dbHost, dbPort, dbName));
        config.setUsername(dbUsername);
        config.setPassword(dbPassword);
        
        // Connection pool settings for local development (smaller pool)
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(30000); // 30 seconds
        config.setIdleTimeout(600000); // 10 minutes
        config.setMaxLifetime(1800000); // 30 minutes
        
        // Connection validation
        config.setConnectionTestQuery("SELECT 1");
        config.setValidationTimeout(5000); // 5 seconds
        
        // PostgreSQL-specific settings
        config.addDataSourceProperty("cachePrepStmts", "true");
        config.addDataSourceProperty("prepStmtCacheSize", "250");
        config.addDataSourceProperty("prepStmtCacheSqlLimit", "2048");
        config.addDataSourceProperty("useServerPrepStmts", "true");

        dataSource = new HikariDataSource(config);
        LOG.info("DataSource configured successfully for local development");
        
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

