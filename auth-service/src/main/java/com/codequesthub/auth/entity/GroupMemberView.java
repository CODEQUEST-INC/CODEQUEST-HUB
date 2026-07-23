package com.codequesthub.auth.entity;

import jakarta.persistence.*;
import java.util.UUID;

// Read-only view onto group-service's group_members table — same physical
// database, no sync job needed. Used only to check whether a user still has
// group memberships before allowing account deletion.
@Entity
@Table(name = "group_members")
public class GroupMemberView {
    @Id
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
}
