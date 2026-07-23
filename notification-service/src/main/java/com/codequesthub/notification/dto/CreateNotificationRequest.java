package com.codequesthub.notification.dto;

import com.codequesthub.notification.model.NotificationType;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class CreateNotificationRequest {

    @NotNull
    private UUID userId;

    @NotNull
    private NotificationType type;

    @NotNull
    private String title;

    @NotNull
    private String message;

    private UUID relatedEntityId;

    // Getters and setters
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public NotificationType getType() { return type; }
    public void setType(NotificationType type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public UUID getRelatedEntityId() { return relatedEntityId; }
    public void setRelatedEntityId(UUID relatedEntityId) { this.relatedEntityId = relatedEntityId; }
}