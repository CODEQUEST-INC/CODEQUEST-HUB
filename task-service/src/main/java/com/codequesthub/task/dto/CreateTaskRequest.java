package com.codequesthub.task.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.UUID;

public class CreateTaskRequest {
    @NotBlank @Size(min = 3, max = 255)
    private String title;

    private String description;
    private UUID assigneeId;
    private LocalDate dueDate;

    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }
    public UUID getAssigneeId() { return assigneeId; }
    public void setAssigneeId(UUID v) { this.assigneeId = v; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate v) { this.dueDate = v; }
}
