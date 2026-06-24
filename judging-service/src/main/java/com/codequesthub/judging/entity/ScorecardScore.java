package com.codequesthub.judging.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "scorecard_scores")
public class ScorecardScore {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scorecard_id", nullable = false)
    private Scorecard scorecard;

    @Column(name = "criterion_id", nullable = false)
    private UUID criterionId;

    @Column(nullable = false)
    private Integer score;

    public ScorecardScore() {}

    public ScorecardScore(Scorecard scorecard, UUID criterionId, Integer score) {
        this.scorecard = scorecard;
        this.criterionId = criterionId;
        this.score = score;
    }

    public UUID getId() { return id; }
    public Scorecard getScorecard() { return scorecard; }
    public UUID getCriterionId() { return criterionId; }
    public Integer getScore() { return score; }
    public void setScore(Integer v) { this.score = v; }
}
