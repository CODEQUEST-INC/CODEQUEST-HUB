package com.codequesthub.project.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "proposal_versions")
public class ProposalVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "proposal_id", nullable = false)
    private UUID proposalId;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "problem_statement", nullable = false, columnDefinition = "TEXT")
    private String problemStatement;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String objectives;

    @Column(name = "tech_stack", nullable = false, columnDefinition = "TEXT")
    private String techStack;

    @Column(nullable = false, length = 50)
    private String action;

    @Column(name = "actor_id", nullable = false)
    private UUID actorId;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getProposalId() { return proposalId; }
    public void setProposalId(UUID v) { this.proposalId = v; }
    public Integer getVersionNumber() { return versionNumber; }
    public void setVersionNumber(Integer v) { this.versionNumber = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getProblemStatement() { return problemStatement; }
    public void setProblemStatement(String v) { this.problemStatement = v; }
    public String getObjectives() { return objectives; }
    public void setObjectives(String v) { this.objectives = v; }
    public String getTechStack() { return techStack; }
    public void setTechStack(String v) { this.techStack = v; }
    public String getAction() { return action; }
    public void setAction(String v) { this.action = v; }
    public UUID getActorId() { return actorId; }
    public void setActorId(UUID v) { this.actorId = v; }
    public String getFeedback() { return feedback; }
    public void setFeedback(String v) { this.feedback = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
