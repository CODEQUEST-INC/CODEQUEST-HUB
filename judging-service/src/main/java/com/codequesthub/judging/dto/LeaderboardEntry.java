package com.codequesthub.judging.dto;

import java.math.BigDecimal;
import java.util.UUID;

public class LeaderboardEntry {

    private final UUID groupId;
    private final String groupName;
    private final Integer groupNumber;
    private final String groupPhotoUrl;
    private final BigDecimal averageScore;
    private final int judgeCount;

    public LeaderboardEntry(UUID groupId, String groupName, Integer groupNumber, String groupPhotoUrl,
                             BigDecimal averageScore, int judgeCount) {
        this.groupId = groupId;
        this.groupName = groupName;
        this.groupNumber = groupNumber;
        this.groupPhotoUrl = groupPhotoUrl;
        this.averageScore = averageScore;
        this.judgeCount = judgeCount;
    }

    public UUID getGroupId() { return groupId; }
    public String getGroupName() { return groupName; }
    public Integer getGroupNumber() { return groupNumber; }
    public String getGroupPhotoUrl() { return groupPhotoUrl; }
    public BigDecimal getAverageScore() { return averageScore; }
    public int getJudgeCount() { return judgeCount; }
}
