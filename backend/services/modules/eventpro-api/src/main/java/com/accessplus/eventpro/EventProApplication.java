package com.accessplus.eventpro;

import com.accessplus.eventpro.api.config.RecaptchaProperties;
import com.accessplus.eventpro.core.config.CorsProperties;
import com.accessplus.eventpro.core.config.EventProApiSecurityProperties;
import com.accessplus.eventpro.core.config.EventProCsrfProperties;
import com.accessplus.eventpro.core.config.EventProSecurityHeadersProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;
import java.util.TimeZone;

@SpringBootApplication(scanBasePackages = "com.accessplus.eventpro")
@EnableConfigurationProperties({EventProSecurityHeadersProperties.class, RecaptchaProperties.class,
        CorsProperties.class, EventProApiSecurityProperties.class, EventProCsrfProperties.class})
@EnableScheduling
@EnableJpaRepositories(
	basePackages = "com.accessplus.eventpro",
	entityManagerFactoryRef = "entityManagerFactory"
)
public class EventProApplication {

	public static void main(String[] args) {
		TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
		SpringApplication.run(EventProApplication.class, args);
	}

}
