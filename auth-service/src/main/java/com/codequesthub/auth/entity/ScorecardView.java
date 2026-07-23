package com.codequesthub.auth.entity;

import jakarta.persistence.*;
import java.util.UUID;

// Read-only view onto judging-service's scorecards table — judge_id is a
// direct user id (ON DELETE CASCADE, not a FK to judges.id), so a hard delete
// would otherwise silently destroy real score data; treated as its own
// independent blocker rather than assumed redundant with JudgeView.
@Entity
@Table(name = "scorecards")
public class ScorecardView {
    @Id
    private UUID id;

    @Column(name = "judge_id")
    private UUID judgeId;

    public UUID getId() { return id; }
    public UUID getJudgeId() { return judgeId; }
}
