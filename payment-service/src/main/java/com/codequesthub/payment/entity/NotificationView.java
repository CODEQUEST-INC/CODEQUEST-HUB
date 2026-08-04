package com.codequesthub.payment.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

// Write-capable view into auth-service's notifications table — same shared-DB
// pattern as judging-service's CohortView, but inserting new rows instead of
// mutating an existing one.
@Entity
@Table(name = "notifications")
public class NotificationView {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(length = 500)
    private String link;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = OffsetDateTime.now(); }

    public void setUserId(UUID v) { this.userId = v; }
    public void setType(String v) { this.type = v; }
    public void setTitle(String v) { this.title = v; }
    public void setBody(String v) { this.body = v; }
    public void setLink(String v) { this.link = v; }
}
