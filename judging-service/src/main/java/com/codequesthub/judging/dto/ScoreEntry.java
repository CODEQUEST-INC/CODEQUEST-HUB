package com.codequesthub.judging.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class ScoreEntry {

    @NotNull
    private UUID criterionId;

    @NotNull
    @Min(1)
    @Max(10)
    private Integer score;

    public UUID getCriterionId() { return criterionId; }
    public void setCriterionId(UUID v) { this.criterionId = v; }
    public Integer getScore() { return score; }
    public void setScore(Integer v) { this.score = v; }
}
