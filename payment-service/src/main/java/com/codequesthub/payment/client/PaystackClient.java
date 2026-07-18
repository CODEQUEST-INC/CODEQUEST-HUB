package com.codequesthub.payment.client;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class PaystackClient {

    private final RestTemplate restTemplate;
    private final String secretKey;
    private final String baseUrl;

    public PaystackClient(RestTemplate restTemplate,
                          @Value("${paystack.secret-key:}") String secretKey,
                          @Value("${paystack.base-url:https://api.paystack.co}") String baseUrl) {
        this.restTemplate = restTemplate;
        this.secretKey = secretKey;
        this.baseUrl = baseUrl;
    }

    public PaystackInitializeResult initializeTransaction(String email,
                                                           long amountKobo,
                                                           String reference,
                                                           String callbackUrl,
                                                           Map<String, Object> metadata) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("email", email);
        payload.put("amount", amountKobo);
        payload.put("reference", reference);
        payload.put("metadata", metadata);
        if (callbackUrl != null && !callbackUrl.isBlank()) {
            payload.put("callback_url", callbackUrl);
        }

        JsonNode root = postJson("/transaction/initialize", payload);
        JsonNode data = root.path("data");
        return new PaystackInitializeResult(
            root.path("status").asBoolean(false),
            root.path("message").asText(""),
            data.path("authorization_url").asText(null),
            data.path("access_code").asText(null),
            data.path("reference").asText(reference)
        );
    }

    public PaystackVerificationResult verifyTransaction(String reference) {
        JsonNode root = getJson("/transaction/verify/" + reference);
        JsonNode data = root.path("data");
        return new PaystackVerificationResult(
            root.path("status").asBoolean(false),
            root.path("message").asText(""),
            data.path("reference").asText(reference),
            data.path("status").asText(null),
            data.path("gateway_response").asText(null),
            data.path("amount").asLong(0L),
            data.path("id").asLong(0L),
            data.path("paid_at").asText(null)
        );
    }

    public boolean isValidWebhook(String rawBody, String signature) {
        if (secretKey == null || secretKey.isBlank() || signature == null || signature.isBlank()) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] hash = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
            String computed = HexFormat.of().formatHex(hash);
            return MessageDigest.isEqual(computed.getBytes(StandardCharsets.UTF_8), signature.trim().getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            return false;
        }
    }

    private JsonNode postJson(String path, Map<String, Object> payload) {
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers());
        return restTemplate.postForObject(baseUrl + path, entity, JsonNode.class);
    }

    private JsonNode getJson(String path) {
        HttpEntity<Void> entity = new HttpEntity<>(headers());
        return restTemplate.exchange(baseUrl + path, org.springframework.http.HttpMethod.GET, entity, JsonNode.class).getBody();
    }

    private HttpHeaders headers() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(secretKey);
        return headers;
    }

    public record PaystackInitializeResult(boolean success,
                                          String message,
                                          String authorizationUrl,
                                          String accessCode,
                                          String reference) {
    }

    public record PaystackVerificationResult(boolean success,
                                             String message,
                                             String reference,
                                             String status,
                                             String gatewayResponse,
                                             long amount,
                                             long transactionId,
                                             String paidAt) {
    }
}