package com.codequesthub.judging.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "cohorts")
public class CohortView {
    @Id
    private UUID id;

    @Column(name = "leaderboard_published_at")
    private OffsetDateTime leaderboardPublishedAt;

    public UUID getId() { return id; }
    public OffsetDateTime getLeaderboardPublishedAt() { return leaderboardPublishedAt; }
    public void setLeaderboardPublishedAt(OffsetDateTime v) { this.leaderboardPublishedAt = v; }
}
