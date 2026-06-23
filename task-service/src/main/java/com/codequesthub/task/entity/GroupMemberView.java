package com.codequesthub.task.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "group_members")
public class GroupMemberView {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "group_id", nullable = false)
    private UUID groupId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    public UUID getId() { return id; }
    public UUID getGroupId() { return groupId; }
    public UUID getUserId() { return userId; }
}
