package com.codequesthub.auth.integration;

import com.codequesthub.auth.AuthServiceApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exercises the real HTTP stack (controller -> service -> JPA repository) against
 * a real, disposable Postgres container — not the shared Neon DB, and not mocked
 * repositories (see AuthServiceTest for that level). Schema is applied from the
 * actual database/init/*.sql files so there's a single source of truth for what
 * "the schema" means.
 */
@Testcontainers
@SpringBootTest(classes = AuthServiceApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthServiceIntegrationTest {

    // stringtype=unspecified matches the real DB_URL (see .env.example's comment) —
    // without it, pgjdbc binds Java Strings as VARCHAR and Postgres rejects the
    // insert into columns typed as a native enum (user_role, proposal_status, etc.)
    // instead of implicitly casting.
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
        .withUrlParam("stringtype", "unspecified");

    // Runs at class-load time — guaranteed to happen before JUnit/Spring ever calls
    // the @DynamicPropertySource method below, which is what needs the container
    // already started and the schema already applied.
    static {
        POSTGRES.start();
        applySchema(POSTGRES);
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("jwt.secret", () -> "integration-test-secret-key-32-characters-min");
        registry.add("jwt.expiration-ms", () -> "3600000");
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @SuppressWarnings("unchecked")
    void registerThenMe_returnsTheSameUser() {
        UUID cohortId = UUID.randomUUID();
        jdbcTemplate.update(
            "INSERT INTO cohorts (id, name, year) VALUES (?, ?, ?)", cohortId, "IT Cohort", 2026);

        Map<String, Object> registerBody = Map.of(
            "fullName", "Integration Test User",
            "email", "integration-test+" + System.nanoTime() + "@example.test",
            "password", "testpass123",
            "role", "student",
            "indexNumber", "6143424",
            "studentId", "20261234",
            "cohortId", cohortId.toString()
        );

        ResponseEntity<Map> registerResponse = restTemplate.postForEntity("/api/auth/register", registerBody, Map.class);
        assertThat(registerResponse.getStatusCode().value()).isEqualTo(201);

        Map<String, Object> registerData = (Map<String, Object>) registerResponse.getBody().get("data");
        String token = (String) registerData.get("token");
        Map<String, Object> registeredUser = (Map<String, Object>) registerData.get("user");
        assertThat(token).isNotBlank();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        ResponseEntity<Map> meResponse = restTemplate.exchange(
            "/api/auth/me", HttpMethod.GET, new HttpEntity<>(headers), Map.class);

        assertThat(meResponse.getStatusCode().value()).isEqualTo(200);
        Map<String, Object> meData = (Map<String, Object>) meResponse.getBody().get("data");
        assertThat(meData.get("id")).isEqualTo(registeredUser.get("id"));
        assertThat(meData.get("email")).isEqualTo(registeredUser.get("email"));
        assertThat(meData.get("fullName")).isEqualTo("Integration Test User");
    }

    private static void applySchema(PostgreSQLContainer<?> container) {
        // Real schema files, applied in order (skips 02_dev_seed.sql — sample data,
        // not schema). Each file is executed as one JDBC statement rather than split
        // on ';' — 01_init_auth_and_groups.sql has a $$-quoted PL/pgSQL function body
        // that a naive client-side split would break.
        String[] files = {
            "01_init_auth_and_groups.sql",
            "03_init_proposals.sql",
            "04_add_group_leader.sql",
            "05_init_tasks.sql",
            "06_init_judging.sql",
            "07_init_showcase.sql",
            "08_add_criterion_active_flag.sql",
            "09_add_group_photo.sql",
            "10_add_proposal_pdf.sql",
            "11_showcase_multiple_photos.sql",
            "12_add_user_cohort.sql",
            "13_payments.sql",
        };
        Path initDir = Path.of("../database/init");
        try (Connection conn = DriverManager.getConnection(
                container.getJdbcUrl(), container.getUsername(), container.getPassword())) {
            for (String file : files) {
                String sql = Files.readString(initDir.resolve(file));
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute(sql);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to apply schema for integration test", e);
        }
    }
}
