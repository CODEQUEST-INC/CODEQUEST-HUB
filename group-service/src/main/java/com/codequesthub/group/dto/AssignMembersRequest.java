package com.codequesthub.group.dto;

import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;

public class AssignMembersRequest {
    @NotEmpty(message = "Provide at least one user ID")
    private List<UUID> userIds;

    public List<UUID> getUserIds() { return userIds; }
    public void setUserIds(List<UUID> v) { this.userIds = v; }
}
