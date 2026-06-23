package com.codequesthub.task.dto;

import jakarta.validation.constraints.*;

public class UpdateTaskStatusRequest {
    @NotBlank
    private String status; // "todo" | "in_progress" | "done"

    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }
}
