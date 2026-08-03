package com.accessplus.eventpro.payment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EntityScan("com.accessplus.eventpro.shared.entity")
@EnableJpaRepositories("com.accessplus.eventpro.payment.repository")
public class PaymentProcessorApplication {

    public static void main(String[] args) {
        SpringApplication.run(PaymentProcessorApplication.class, args);
    }
}
