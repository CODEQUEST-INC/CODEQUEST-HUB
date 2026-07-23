package com.codequesthub.notification.dto;

import com.codequesthub.notification.model.Notification;
import com.codequesthub.notification.model.NotificationType;

import java.time.LocalDateTime;
import java.util.UUID;

public class NotificationResponse {

    private UUID id;
    private NotificationType type;
    private String title;
    private String message;
    private UUID relatedEntityId;
    private boolean isRead;
    private LocalDateTime createdAt;

    public static NotificationResponse fromEntity(Notification n) {
        NotificationResponse res = new NotificationResponse();
        res.id = n.getId();
        res.type = n.getType();
        res.title = n.getTitle();
        res.message = n.getMessage();
        res.relatedEntityId = n.getRelatedEntityId();
        res.isRead = n.isRead();
        res.createdAt = n.getCreatedAt();
        return res;
    }

    // Getters (no setters needed, read-only response)
    public UUID getId() { return id; }
    public NotificationType getType() { return type; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public UUID getRelatedEntityId() { return relatedEntityId; }
    public boolean isRead() { return isRead; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}