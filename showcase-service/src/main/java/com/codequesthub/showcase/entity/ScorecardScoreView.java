package com.codequesthub.showcase.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "scorecard_scores")
public class ScorecardScoreView {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scorecard_id")
    private ScorecardView scorecard;

    @Column(name = "criterion_id")
    private UUID criterionId;

    @Column(nullable = false)
    private Integer score;

    public UUID getCriterionId() { return criterionId; }
    public Integer getScore() { return score; }
}
