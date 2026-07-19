package com.codequesthub.showcase.dto;

import com.codequesthub.showcase.entity.ShowcaseEntry;
import com.codequesthub.showcase.entity.ShowcasePhoto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class ShowcaseEntryResponse {

    private final UUID id;
    private final UUID groupId;
    private final Integer groupNumber;
    private final String groupName;
    private final UUID cohortId;
    private final String title;
    private final String description;
    private final String githubUrl;
    private final List<ShowcasePhotoResponse> photos;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;

    public ShowcaseEntryResponse(ShowcaseEntry entry, Integer groupNumber, String groupName, List<ShowcasePhoto> photos) {
        this.id = entry.getId();
        this.groupId = entry.getGroupId();
        this.groupNumber = groupNumber;
        this.groupName = groupName;
        this.cohortId = entry.getCohortId();
        this.title = entry.getTitle();
        this.description = entry.getDescription();
        this.githubUrl = entry.getGithubUrl();
        this.photos = photos.stream().map(ShowcasePhotoResponse::new).toList();
        this.createdAt = entry.getCreatedAt();
        this.updatedAt = entry.getUpdatedAt();
    }

    public UUID getId() { return id; }
    public UUID getGroupId() { return groupId; }
    public Integer getGroupNumber() { return groupNumber; }
    public String getGroupName() { return groupName; }
    public UUID getCohortId() { return cohortId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getGithubUrl() { return githubUrl; }
    public List<ShowcasePhotoResponse> getPhotos() { return photos; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
