package com.accessplus.eventpro.api.config;

import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@Profile({"local", "lstk", "dev"})
@RequiredArgsConstructor
public class DevAdminSeeder implements ApplicationRunner {

    private static final String ADMIN_EMAIL = "admin@event.com";
    private static final String ADMIN_PASSWORD = "Password@123";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.findByEmailIgnoreCase(ADMIN_EMAIL).isPresent()) {
            log.info("Dev admin seed skipped; {} already exists", ADMIN_EMAIL);
            return;
        }

        UserEntity admin = new UserEntity();
        admin.setEmail(ADMIN_EMAIL);
        admin.setPasswordHash(passwordEncoder.encode(ADMIN_PASSWORD));
        admin.setFirstName("Admin");
        admin.setLastName("User");
        admin.setStatus("ACTIVE");
        admin.setRole("ADMIN");

        userRepository.save(admin);
        log.info("Seeded dev admin account {}", ADMIN_EMAIL);
    }
}
