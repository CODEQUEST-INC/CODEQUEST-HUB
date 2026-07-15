package com.codequesthub.group.integration;

import com.codequesthub.common.security.JwtUtil;
import com.codequesthub.group.GroupServiceApplication;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Real Postgres via Testcontainers, real HTTP through the actual controller ->
 * service -> JPA repository stack. See AuthServiceIntegrationTest for the pattern
 * this mirrors (schema application, stringtype=unspecified, dynamic properties).
 */
@Testcontainers
@SpringBootTest(classes = GroupServiceApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class GroupServiceIntegrationTest {

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
    @SuppressWarnings("unchecked")
    void listGroupsByCohort_returnsSeededGroup() {
        UUID cohortId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        jdbcTemplate.update(
            "INSERT INTO cohorts (id, name, year) VALUES (?, ?, ?)",
            cohortId, "Integration Test Cohort", 2026);
        jdbcTemplate.update(
            "INSERT INTO groups (id, cohort_id, group_number, name) VALUES (?, ?, ?, ?)",
            groupId, cohortId, 9001, "Integration Test Group");

        String token = jwtUtil.generateToken(UUID.randomUUID().toString(), "someone@example.test", "student");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        ResponseEntity<Map> response = restTemplate.exchange(
            "/api/groups?cohortId=" + cohortId, HttpMethod.GET, new HttpEntity<>(headers), Map.class);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        List<Map<String, Object>> groups = (List<Map<String, Object>>) response.getBody().get("data");
        assertThat(groups).hasSize(1);
        assertThat(groups.get(0).get("id")).isEqualTo(groupId.toString());
        assertThat(groups.get(0).get("groupNumber")).isEqualTo(9001);
        assertThat(groups.get(0).get("name")).isEqualTo("Integration Test Group");
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
