package com.codequesthub.showcase.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "showcase_photos")
public class ShowcasePhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "entry_id", nullable = false)
    private UUID entryId;

    @Column(name = "photo_path", nullable = false, length = 255)
    private String photoPath;

    @Column(nullable = false)
    private Integer position = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getEntryId() { return entryId; }
    public void setEntryId(UUID v) { this.entryId = v; }
    public String getPhotoPath() { return photoPath; }
    public void setPhotoPath(String v) { this.photoPath = v; }
    public Integer getPosition() { return position; }
    public void setPosition(Integer v) { this.position = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
