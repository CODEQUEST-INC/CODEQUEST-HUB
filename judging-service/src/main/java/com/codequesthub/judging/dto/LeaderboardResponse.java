package com.codequesthub.judging.dto;

import java.time.OffsetDateTime;
import java.util.List;

// Wraps the leaderboard entries with publish state so the frontend can show
// "results not published yet" rather than an empty list with no explanation.
// Admins always get live entries regardless of published (they need to QA
// standings before publishing); everyone else gets entries only once published.
public class LeaderboardResponse {

    private final boolean published;
    private final OffsetDateTime publishedAt;
    private final List<LeaderboardEntry> entries;

    public LeaderboardResponse(boolean published, OffsetDateTime publishedAt, List<LeaderboardEntry> entries) {
        this.published = published;
        this.publishedAt = publishedAt;
        this.entries = entries;
    }

    public boolean isPublished() { return published; }
    public OffsetDateTime getPublishedAt() { return publishedAt; }
    public List<LeaderboardEntry> getEntries() { return entries; }
}
