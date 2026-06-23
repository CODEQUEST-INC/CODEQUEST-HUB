package com.codequesthub.task.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public class UpdateTaskRequest {
    @NotBlank @Size(min = 3, max = 255)
    private String title;

    private String description;
    private LocalDate dueDate;

    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate v) { this.dueDate = v; }
}
