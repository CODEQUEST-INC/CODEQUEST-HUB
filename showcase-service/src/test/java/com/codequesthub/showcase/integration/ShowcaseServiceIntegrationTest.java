package com.codequesthub.showcase.integration;

import com.codequesthub.common.security.JwtUtil;
import com.codequesthub.showcase.ShowcaseServiceApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
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
@SpringBootTest(classes = ShowcaseServiceApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ShowcaseServiceIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
        .withUrlParam("stringtype", "unspecified");

    static final Path UPLOAD_DIR;

    static {
        POSTGRES.start();
        applySchema(POSTGRES);
        try {
            UPLOAD_DIR = Files.createTempDirectory("codequesthub-showcase-it");
        } catch (java.io.IOException e) {
            throw new RuntimeException(e);
        }
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("jwt.secret", () -> "integration-test-secret-key-32-characters-min");
        registry.add("jwt.expiration-ms", () -> "3600000");
        registry.add("showcase.upload-dir", UPLOAD_DIR::toString);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private JwtUtil jwtUtil;

    @Test
    @SuppressWarnings("unchecked")
    void upsertEntry_thenPublicGet_returnsItUnauthenticated() {
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
            groupId, cohortId, 9004, "IT Group");
        jdbcTemplate.update(
            "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)", groupId, userId);
        jdbcTemplate.update(
            "INSERT INTO proposals (group_id, title, problem_statement, objectives, tech_stack, status, submitted_by) " +
                "VALUES (?, ?, ?, ?, ?, 'approved', ?)",
            groupId, "Approved Proposal", "A long enough problem statement for validation.",
            "Objectives", "Tech stack", userId);

        String token = jwtUtil.generateToken(userId.toString(), "student@example.test", "student");
        HttpHeaders authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(token);
        authHeaders.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> body = Map.of(
            "title", "Integration Test Showcase",
            "description", "A showcase description",
            "githubUrl", "https://github.com/example/repo");

        ResponseEntity<Map> upsertResponse = restTemplate.exchange(
            "/api/showcase/" + groupId, HttpMethod.POST, new HttpEntity<>(body, authHeaders), Map.class);
        assertThat(upsertResponse.getStatusCode().value()).isEqualTo(200);

        // Public GET — no Authorization header at all.
        ResponseEntity<Map> publicGet = restTemplate.exchange(
            "/api/showcase/" + groupId, HttpMethod.GET, HttpEntity.EMPTY, Map.class);
        assertThat(publicGet.getStatusCode().value()).isEqualTo(200);
        Map<String, Object> data = (Map<String, Object>) publicGet.getBody().get("data");
        assertThat(data.get("title")).isEqualTo("Integration Test Showcase");
        assertThat(data.get("groupNumber")).isEqualTo(9004);
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
            "09_add_group_photo.sql",
            "10_add_proposal_pdf.sql",
            "11_showcase_multiple_photos.sql",
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
