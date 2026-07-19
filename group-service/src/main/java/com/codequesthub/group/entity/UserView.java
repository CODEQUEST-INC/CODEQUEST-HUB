package com.codequesthub.group.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "users")
public class UserView {
    @Id
    private UUID id;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "index_number")
    private String indexNumber;

    @Column(name = "cohort_id")
    private UUID cohortId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", columnDefinition = "user_role")
    private UserRole role;

    public UUID getId() { return id; }
    public String getFullName() { return fullName; }
    public String getIndexNumber() { return indexNumber; }
    public UUID getCohortId() { return cohortId; }
    public UserRole getRole() { return role; }
}
