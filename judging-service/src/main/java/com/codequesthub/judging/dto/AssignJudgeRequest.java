package com.codequesthub.judging.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class AssignJudgeRequest {

    @NotNull
    private UUID cohortId;

    @NotNull
    private UUID userId;

    public UUID getCohortId() { return cohortId; }
    public void setCohortId(UUID v) { this.cohortId = v; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID v) { this.userId = v; }
}
