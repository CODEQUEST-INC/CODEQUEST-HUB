package com.codequesthub.judging.integration;

import com.codequesthub.common.security.JwtUtil;
import com.codequesthub.judging.JudgingServiceApplication;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Real Postgres via Testcontainers, real HTTP through the actual controller ->
 * service -> JPA repository stack. Mirrors GroupServiceIntegrationTest's pattern.
 */
@Testcontainers
@SpringBootTest(classes = JudgingServiceApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class JudgingServiceIntegrationTest {

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
    void createCriterionThenList_reflectsIt_andBudgetIsEnforcedAgainstRealData() {
        UUID cohortId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        jdbcTemplate.update(
            "INSERT INTO cohorts (id, name, year) VALUES (?, ?, ?)", cohortId, "IT Cohort", 2026);

        String token = jwtUtil.generateToken(adminId.toString(), "admin@example.test", "admin");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> firstCriterion = Map.of("cohortId", cohortId.toString(), "name", "Innovation", "weight", 70);
        ResponseEntity<Map> createResponse = restTemplate.exchange(
            "/api/judging/criteria", HttpMethod.POST, new HttpEntity<>(firstCriterion, headers), Map.class);
        assertThat(createResponse.getStatusCode().value()).isEqualTo(201);

        ResponseEntity<Map> listResponse = restTemplate.exchange(
            "/api/judging/criteria?cohortId=" + cohortId, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
        List<Map<String, Object>> criteria = (List<Map<String, Object>>) listResponse.getBody().get("data");
        assertThat(criteria).hasSize(1);
        assertThat(criteria.get(0).get("name")).isEqualTo("Innovation");

        // A second criterion that would push the real, DB-persisted total over
        // 100 must be rejected — proves the weight-budget query runs against
        // actual Postgres rows, not just the request's own DTO.
        Map<String, Object> secondCriterion = Map.of("cohortId", cohortId.toString(), "name", "Execution", "weight", 31);
        ResponseEntity<Map> secondCreate = restTemplate.exchange(
            "/api/judging/criteria", HttpMethod.POST, new HttpEntity<>(secondCriterion, headers), Map.class);
        assertThat(secondCreate.getStatusCode().value()).isEqualTo(400);
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
