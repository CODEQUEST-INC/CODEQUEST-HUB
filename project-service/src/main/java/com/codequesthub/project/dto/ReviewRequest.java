package com.codequesthub.project.dto;

import jakarta.validation.constraints.*;

public class ReviewRequest {
    @NotBlank
    @Pattern(regexp = "approved|rejected|changes_requested",
        message = "must be one of: approved, rejected, changes_requested")
    private String action;

    @Size(min = 10)
    private String feedback;

    public String getAction() { return action; }
    public void setAction(String v) { this.action = v; }
    public String getFeedback() { return feedback; }
    public void setFeedback(String v) { this.feedback = v; }

    public boolean isValid() {
        if ("rejected".equals(action) || "changes_requested".equals(action)) {
            return feedback != null && feedback.trim().length() >= 10;
        }
        return true;
    }
}
