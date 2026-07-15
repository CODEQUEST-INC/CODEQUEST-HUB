package com.codequesthub.project.integration;

import com.codequesthub.common.security.JwtUtil;
import com.codequesthub.project.ProjectServiceApplication;
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
 * Real Postgres via Testcontainers, real HTTP through the actual controller ->
 * service -> JPA repository stack. Mirrors GroupServiceIntegrationTest's pattern.
 */
@Testcontainers
@SpringBootTest(classes = ProjectServiceApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ProposalServiceIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
        .withUrlParam("stringtype", "unspecified");

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

    @Autowired
    private JwtUtil jwtUtil;

    @Test
    void submitThenFetchMyProposal_andSecondSubmitConflicts() {
        UUID cohortId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();

        jdbcTemplate.update(
            "INSERT INTO cohorts (id, name, year) VALUES (?, ?, ?)", cohortId, "IT Cohort", 2026);
        jdbcTemplate.update(
            "INSERT INTO users (id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, 'student')",
            userId, "Test Student", "student-" + userId + "@example.test", "irrelevant-hash");
        jdbcTemplate.update(
            "INSERT INTO groups (id, cohort_id, group_number, name) VALUES (?, ?, ?, ?)",
            groupId, cohortId, 9002, "IT Group");
        jdbcTemplate.update(
            "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)", groupId, userId);

        String token = jwtUtil.generateToken(userId.toString(), "student@example.test", "student");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

        Map<String, String> body = Map.of(
            "title", "Integration Test Proposal",
            "problemStatement", "A problem statement that is definitely long enough to pass validation.",
            "objectives", "Objectives long enough to pass",
            "techStack", "Spring Boot, Postgres");

        ResponseEntity<Map> submitResponse = restTemplate.exchange(
            "/api/proposals", HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
        assertThat(submitResponse.getStatusCode().value()).isEqualTo(201);

        ResponseEntity<Map> myResponse = restTemplate.exchange(
            "/api/proposals/my", HttpMethod.GET, new HttpEntity<>(headers), Map.class);
        assertThat(myResponse.getStatusCode().value()).isEqualTo(200);
        Map<String, Object> data = (Map<String, Object>) myResponse.getBody().get("data");
        assertThat(data.get("title")).isEqualTo("Integration Test Proposal");
        assertThat(data.get("status")).isEqualTo("submitted");

        // Second submission for the same group must be rejected by the real
        // DB-backed one-proposal-per-group check, not just a mock.
        ResponseEntity<Map> secondSubmit = restTemplate.exchange(
            "/api/proposals", HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
        assertThat(secondSubmit.getStatusCode().value()).isEqualTo(409);
    }

    private static void applySchema(PostgreSQLContainer<?> container) {
        String[] files = {
            "01_init_auth_and_groups.sql",
            "03_init_proposals.sql",
            "04_add_group_leader.sql",
            "05_init_tasks.sql",
            "06_init_judging.sql",
            "07_init_showcase.sql",
            "08_add_criterion_active_flag.sql",
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
