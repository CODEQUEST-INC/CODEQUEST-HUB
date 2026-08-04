package com.codequesthub.judging.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "scorecards")
public class Scorecard {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "group_id", nullable = false)
    private UUID groupId;

    @Column(name = "judge_id", nullable = false)
    private UUID judgeId;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private OffsetDateTime submittedAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @OneToMany(mappedBy = "scorecard", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ScorecardScore> scores = new ArrayList<>();

    @PrePersist
    protected void onCreate() { submittedAt = updatedAt = OffsetDateTime.now(); }

    @PreUpdate
    protected void onUpdate() { updatedAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getGroupId() { return groupId; }
    public void setGroupId(UUID v) { this.groupId = v; }
    public UUID getJudgeId() { return judgeId; }
    public void setJudgeId(UUID v) { this.judgeId = v; }
    public OffsetDateTime getSubmittedAt() { return submittedAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public String getComment() { return comment; }
    public void setComment(String v) { this.comment = v; }
    public List<ScorecardScore> getScores() { return scores; }
}
