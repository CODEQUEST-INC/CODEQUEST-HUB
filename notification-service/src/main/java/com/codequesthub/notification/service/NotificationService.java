package com.codequesthub.notification.service;

import com.codequesthub.notification.dto.CreateNotificationRequest;
import com.codequesthub.notification.dto.NotificationResponse;
import com.codequesthub.notification.model.Notification;
import com.codequesthub.notification.repository.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository repository;

    public NotificationService(NotificationRepository repository) {
        this.repository = repository;
    }

    public NotificationResponse create(CreateNotificationRequest req) {
        Notification notification = new Notification(
                req.getUserId(),
                req.getType(),
                req.getTitle(),
                req.getMessage(),
                req.getRelatedEntityId()
        );
        return NotificationResponse.fromEntity(repository.save(notification));
    }

    public Page<NotificationResponse> getForUser(UUID userId, Pageable pageable) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(NotificationResponse::fromEntity);
    }

    public long getUnreadCount(UUID userId) {
        return repository.countByUserIdAndIsReadFalse(userId);
    }

    public boolean markAsRead(UUID notificationId, UUID userId) {
        return repository.markAsRead(notificationId, userId) > 0;
    }

    public void markAllAsRead(UUID userId) {
        repository.markAllAsRead(userId);
    }
}