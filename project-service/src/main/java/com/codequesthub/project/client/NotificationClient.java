package com.codequesthub.project.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

@Component
public class NotificationClient {

    private static final Logger log = LoggerFactory.getLogger(NotificationClient.class);

    private final RestTemplate restTemplate;
    private final String notificationServiceUrl;

    public NotificationClient(RestTemplate restTemplate,
                               @Value("${notification.service.url}") String notificationServiceUrl) {
        this.restTemplate = restTemplate;
        this.notificationServiceUrl = notificationServiceUrl;
    }

    // Fire-and-forget: a notification failure must never break the proposal
    // action itself, so any exception here is logged and swallowed.
    public void send(UUID userId, String type, String title, String message, UUID relatedEntityId) {
        try {
            Map<String, Object> body = Map.of(
                "userId", userId,
                "type", type,
                "title", title,
                "message", message,
                "relatedEntityId", relatedEntityId
            );
            restTemplate.postForObject(notificationServiceUrl + "/api/notifications", body, Void.class);
        } catch (Exception e) {
            log.warn("Failed to send notification (userId={}, type={}): {}", userId, type, e.getMessage());
        }
    }
}