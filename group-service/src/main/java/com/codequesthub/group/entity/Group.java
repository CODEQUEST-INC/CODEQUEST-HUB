package com.codequesthub.group.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "groups")
public class Group {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "cohort_id", nullable = false)
    private UUID cohortId;

    @Column(name = "group_number", nullable = false)
    private Integer groupNumber;

    @Column(length = 150)
    private String name;

    @Column(name = "supervisor_id")
    private UUID supervisorId;

    @Column(name = "group_leader_id")
    private UUID groupLeaderId;

    @Column(name = "photo_path", length = 255)
    private String photoPath;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getCohortId() { return cohortId; }
    public void setCohortId(UUID v) { this.cohortId = v; }
    public Integer getGroupNumber() { return groupNumber; }
    public void setGroupNumber(Integer v) { this.groupNumber = v; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public UUID getSupervisorId() { return supervisorId; }
    public void setSupervisorId(UUID v) { this.supervisorId = v; }
    public UUID getGroupLeaderId() { return groupLeaderId; }
    public void setGroupLeaderId(UUID v) { this.groupLeaderId = v; }
    public String getPhotoPath() { return photoPath; }
    public void setPhotoPath(String v) { this.photoPath = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
