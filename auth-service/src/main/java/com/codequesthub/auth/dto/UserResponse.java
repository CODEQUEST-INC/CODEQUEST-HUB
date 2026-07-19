package com.codequesthub.auth.dto;

import com.codequesthub.auth.entity.User;
import java.time.OffsetDateTime;
import java.util.UUID;

public class UserResponse {
    private UUID id;
    private String fullName;
    private String email;
    private String role;
    private String studentId;
    private String indexNumber;
    private UUID cohortId;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public static UserResponse from(User u) {
        UserResponse r = new UserResponse();
        r.id = u.getId();
        r.fullName = u.getFullName();
        r.email = u.getEmail();
        r.role = u.getRole().name();
        r.studentId = u.getStudentId();
        r.indexNumber = u.getIndexNumber();
        r.cohortId = u.getCohortId();
        r.createdAt = u.getCreatedAt();
        r.updatedAt = u.getUpdatedAt();
        return r;
    }

    public UUID getId() { return id; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public String getStudentId() { return studentId; }
    public String getIndexNumber() { return indexNumber; }
    public UUID getCohortId() { return cohortId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
