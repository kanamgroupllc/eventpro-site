package com.accessplus.eventpro.core.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "aws")
public class AwsProperties {
    
    private SecretsManagerProperties secretsManager = new SecretsManagerProperties();
    
    public SecretsManagerProperties getSecretsManager() {
        return secretsManager;
    }
    
    public void setSecretsManager(SecretsManagerProperties secretsManager) {
        this.secretsManager = secretsManager;
    }
    
    public static class SecretsManagerProperties {
        private String secretArn;
        
        public String getSecretArn() {
            return secretArn;
        }
        
        public void setSecretArn(String secretArn) {
            this.secretArn = secretArn;
        }
    }
}

