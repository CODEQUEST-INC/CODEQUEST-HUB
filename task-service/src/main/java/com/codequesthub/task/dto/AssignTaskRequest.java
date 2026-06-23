package com.codequesthub.task.dto;

import jakarta.validation.constraints.*;
import java.util.UUID;

public class AssignTaskRequest {
    @NotNull
    private UUID userId;

    public UUID getUserId() { return userId; }
    public void setUserId(UUID v) { this.userId = v; }
}
