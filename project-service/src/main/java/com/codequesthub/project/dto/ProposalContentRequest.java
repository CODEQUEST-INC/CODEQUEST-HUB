package com.codequesthub.project.dto;

import jakarta.validation.constraints.*;

public class ProposalContentRequest {
    @NotBlank @Size(min = 5, max = 255)
    private String title;

    @NotBlank @Size(min = 20)
    private String problemStatement;

    @NotBlank @Size(min = 10)
    private String objectives;

    @NotBlank @Size(min = 3)
    private String techStack;

    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getProblemStatement() { return problemStatement; }
    public void setProblemStatement(String v) { this.problemStatement = v; }
    public String getObjectives() { return objectives; }
    public void setObjectives(String v) { this.objectives = v; }
    public String getTechStack() { return techStack; }
    public void setTechStack(String v) { this.techStack = v; }
}
