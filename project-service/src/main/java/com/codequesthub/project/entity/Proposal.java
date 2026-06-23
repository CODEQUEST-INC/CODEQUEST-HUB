package com.codequesthub.project.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "proposals")
public class Proposal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "group_id", nullable = false, unique = true)
    private UUID groupId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "problem_statement", nullable = false, columnDefinition = "TEXT")
    private String problemStatement;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String objectives;

    @Column(name = "tech_stack", nullable = false, columnDefinition = "TEXT")
    private String techStack;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "proposal_status")
    private ProposalStatus status = ProposalStatus.draft;

    @Column(name = "current_version", nullable = false)
    private Integer currentVersion = 1;

    @Column(name = "submitted_by", nullable = false)
    private UUID submittedBy;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() { createdAt = updatedAt = OffsetDateTime.now(); }

    @PreUpdate
    protected void onUpdate() { updatedAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getGroupId() { return groupId; }
    public void setGroupId(UUID v) { this.groupId = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getProblemStatement() { return problemStatement; }
    public void setProblemStatement(String v) { this.problemStatement = v; }
    public String getObjectives() { return objectives; }
    public void setObjectives(String v) { this.objectives = v; }
    public String getTechStack() { return techStack; }
    public void setTechStack(String v) { this.techStack = v; }
    public ProposalStatus getStatus() { return status; }
    public void setStatus(ProposalStatus v) { this.status = v; }
    public Integer getCurrentVersion() { return currentVersion; }
    public void setCurrentVersion(Integer v) { this.currentVersion = v; }
    public UUID getSubmittedBy() { return submittedBy; }
    public void setSubmittedBy(UUID v) { this.submittedBy = v; }
    public UUID getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(UUID v) { this.reviewedBy = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
