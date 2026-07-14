package com.codequesthub.auth.dto;

import com.codequesthub.auth.entity.User;
import java.util.UUID;

public class UserSummaryResponse {
    private UUID id;
    private String fullName;

    public static UserSummaryResponse from(User u) {
        UserSummaryResponse r = new UserSummaryResponse();
        r.id = u.getId();
        r.fullName = u.getFullName();
        return r;
    }

    public UUID getId() { return id; }
    public String getFullName() { return fullName; }
}
