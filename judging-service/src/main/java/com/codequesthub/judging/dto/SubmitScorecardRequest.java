package com.codequesthub.judging.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public class SubmitScorecardRequest {

    @NotNull
    private UUID groupId;

    @NotEmpty
    @Valid
    private List<ScoreEntry> scores;

    public UUID getGroupId() { return groupId; }
    public void setGroupId(UUID v) { this.groupId = v; }
    public List<ScoreEntry> getScores() { return scores; }
    public void setScores(List<ScoreEntry> v) { this.scores = v; }
}
