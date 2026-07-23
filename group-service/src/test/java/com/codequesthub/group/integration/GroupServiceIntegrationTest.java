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

    @Test
    @SuppressWarnings("unchecked")
    void autoGroup_rerunOnSameCohort_dissolvesAndRebuildsWithoutGroupNumberCollision() {
        UUID cohortId = UUID.randomUUID();
        jdbcTemplate.update(
            "INSERT INTO cohorts (id, name, year) VALUES (?, ?, ?)", cohortId, "Auto Group Cohort", 2026);

        for (int i = 1; i <= 5; i++) {
            UUID userId = UUID.randomUUID();
            jdbcTemplate.update(
                "INSERT INTO users (id, full_name, email, password_hash, role, index_number, cohort_id) " +
                "VALUES (?, ?, ?, ?, 'student', ?, ?)",
                userId, "Student " + i, "student" + i + "-" + userId + "@example.test", "irrelevant-hash",
                "600000" + i, cohortId);
        }

        String adminToken = jwtUtil.generateToken(UUID.randomUUID().toString(), "admin@example.test", "admin");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

        // First run: groups of 2 -> [2, 2, 1]. This alone wouldn't have caught
        // the flush-ordering bug — it only surfaces on a second run against
        // group numbers that already exist.
        ResponseEntity<Map> firstRun = restTemplate.exchange(
            "/api/groups/cohorts/" + cohortId + "/auto-group", HttpMethod.POST,
            new HttpEntity<>(Map.of("groupSize", 2), headers), Map.class);
        assertThat(firstRun.getStatusCode().value()).isEqualTo(200);

        // Second run with a different group size: the new groups reuse group
        // numbers 1..N, which previously collided with the not-yet-deleted
        // old rows (Hibernate flushes inserts before deletes by default).
        ResponseEntity<Map> secondRun = restTemplate.exchange(
            "/api/groups/cohorts/" + cohortId + "/auto-group", HttpMethod.POST,
            new HttpEntity<>(Map.of("groupSize", 3), headers), Map.class);

        assertThat(secondRun.getStatusCode().value()).isEqualTo(200);
        Map<String, Object> data = (Map<String, Object>) secondRun.getBody().get("data");
        assertThat(data.get("studentsGrouped")).isEqualTo(5);
        assertThat(data.get("groupsCreated")).isEqualTo(2); // groups of 3 -> [3, 2]
    }

    @Test
    @SuppressWarnings("unchecked")
    void removeMember_realTransaction_deletesRowAndClearsLeader() {
        // Regression test: deleteByGroupIdAndUserId is a custom derived delete
        // query — it threw TransactionRequiredException at runtime (invisible to
        // Mockito-based unit tests, which never touch a real EntityManager) until
        // @Transactional was added to GroupService.removeMember. Only a real
        // persistence layer like this one catches that class of bug.
        UUID cohortId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        jdbcTemplate.update(
            "INSERT INTO cohorts (id, name, year) VALUES (?, ?, ?)", cohortId, "Remove Member Cohort", 2026);
        jdbcTemplate.update(
            "INSERT INTO users (id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, 'student')",
            userId, "Removable Student", "removable-" + userId + "@example.test", "irrelevant-hash");
        jdbcTemplate.update(
            "INSERT INTO groups (id, cohort_id, group_number, group_leader_id) VALUES (?, ?, ?, ?)",
            groupId, cohortId, 9002, userId);
        jdbcTemplate.update(
            "INSERT INTO group_members (id, group_id, user_id) VALUES (?, ?, ?)", UUID.randomUUID(), groupId, userId);

        String adminToken = jwtUtil.generateToken(UUID.randomUUID().toString(), "admin@example.test", "admin");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);

        ResponseEntity<Map> response = restTemplate.exchange(
            "/api/groups/" + groupId + "/members/" + userId, HttpMethod.DELETE, new HttpEntity<>(headers), Map.class);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
        assertThat(data.get("groupLeaderId")).isNull();

        Integer remaining = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", Integer.class, groupId, userId);
        assertThat(remaining).isZero();
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
            "12_add_user_cohort.sql",
            "13_payments.sql",
            "14_payments_per_student.sql",
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
