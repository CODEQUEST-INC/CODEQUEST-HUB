package com.codequesthub.showcase.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UpsertShowcaseRequest {

    @NotBlank
    @Size(max = 255)
    private String title;

    @NotBlank
    private String description;

    @NotBlank
    @Size(max = 500)
    private String githubUrl;

    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }
    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String v) { this.githubUrl = v; }
}
