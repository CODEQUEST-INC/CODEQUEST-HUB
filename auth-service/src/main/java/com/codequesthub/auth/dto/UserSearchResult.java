package com.codequesthub.auth.dto;

import com.codequesthub.auth.entity.User;
import java.util.UUID;

// Slightly richer than UserSummaryResponse (adds role) so an admin picking a
// person out of a type-ahead list can tell two same-named users apart.
public class UserSearchResult {
    private UUID id;
    private String fullName;
    private String role;

    public static UserSearchResult from(User u) {
        UserSearchResult r = new UserSearchResult();
        r.id = u.getId();
        r.fullName = u.getFullName();
        r.role = u.getRole().name();
        return r;
    }

    public UUID getId() { return id; }
    public String getFullName() { return fullName; }
    public String getRole() { return role; }
}
