package com.codequesthub.payment.integration;

import com.codequesthub.common.security.JwtUtil;
import com.codequesthub.payment.PaymentServiceApplication;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
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

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
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
 * service -> JPA repository stack. Paystack itself is stubbed with a plain JDK
 * HttpServer (no new test dependency) so initialize -> verify can be exercised
 * end-to-end without calling the real Paystack API.
 */
@Testcontainers
@SpringBootTest(classes = PaymentServiceApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PaymentServiceIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
        .withUrlParam("stringtype", "unspecified");

    static final HttpServer PAYSTACK_STUB;

    static {
        POSTGRES.start();
        applySchema(POSTGRES);
        PAYSTACK_STUB = startPaystackStub();
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("jwt.secret", () -> "integration-test-secret-key-32-characters-min");
        registry.add("jwt.expiration-ms", () -> "3600000");
        registry.add("paystack.secret-key", () -> "sk_test_stub");
        registry.add("paystack.base-url", () -> "http://localhost:" + PAYSTACK_STUB.getAddress().getPort());
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private JwtUtil jwtUtil;

    @Test
    @SuppressWarnings("unchecked")
    void initializeThenVerify_marksPaymentSuccess() {
        UUID cohortId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        jdbcTemplate.update(
            "INSERT INTO cohorts (id, name, year) VALUES (?, ?, ?)", cohortId, "IT Cohort", 2026);
        jdbcTemplate.update(
            "INSERT INTO users (id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, 'student')",
            userId, "IT Student", "it-student-" + userId + "@example.test", "irrelevant-hash");
        jdbcTemplate.update(
            "INSERT INTO groups (id, cohort_id, group_number, name) VALUES (?, ?, ?, ?)",
            groupId, cohortId, 9010, "IT Payment Group");
        jdbcTemplate.update(
            "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)", groupId, userId);
        jdbcTemplate.update(
            "INSERT INTO payment_fee_configs (id, cohort_id, amount_pesewas) VALUES (?, ?, ?)",
            UUID.randomUUID(), cohortId, 5000);

        String token = jwtUtil.generateToken(userId.toString(), "it-student@example.test", "student");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> initBody = Map.of("groupId", groupId.toString(), "shirtSize", "L");
        ResponseEntity<Map> initResponse = restTemplate.exchange(
            "/api/payments/initialize", HttpMethod.POST, new HttpEntity<>(initBody, headers), Map.class);
        assertThat(initResponse.getStatusCode().value()).isEqualTo(200);

        Map<String, Object> initData = (Map<String, Object>) initResponse.getBody().get("data");
        String reference = (String) initData.get("reference");
        assertThat((String) initData.get("authorizationUrl")).isEqualTo("https://paystack-stub.test/checkout");

        ResponseEntity<Map> verifyResponse = restTemplate.exchange(
            "/api/payments/verify/" + reference, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
        assertThat(verifyResponse.getStatusCode().value()).isEqualTo(200);
        Map<String, Object> verifyData = (Map<String, Object>) verifyResponse.getBody().get("data");
        assertThat(verifyData.get("status")).isEqualTo("success");
    }

    private static HttpServer startPaystackStub() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
            server.createContext("/transaction/initialize", exchange ->
                sendJson(exchange, "{\"status\":true,\"data\":{\"authorization_url\":\"https://paystack-stub.test/checkout\"}}"));
            server.createContext("/transaction/verify/", exchange ->
                sendJson(exchange, "{\"data\":{\"status\":\"success\"}}"));
            server.start();
            return server;
        } catch (IOException e) {
            throw new RuntimeException("Failed to start Paystack stub server", e);
        }
    }

    private static void sendJson(HttpExchange exchange, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
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
