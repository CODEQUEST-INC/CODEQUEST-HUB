package com.codequesthub.showcase.dto;

import com.codequesthub.showcase.entity.ShowcasePhoto;
import java.util.UUID;

public class ShowcasePhotoResponse {
    private final UUID id;
    private final String url;

    public ShowcasePhotoResponse(ShowcasePhoto photo) {
        this.id = photo.getId();
        this.url = "/api/showcase/photos/" + photo.getPhotoPath();
    }

    public UUID getId() { return id; }
    public String getUrl() { return url; }
}
