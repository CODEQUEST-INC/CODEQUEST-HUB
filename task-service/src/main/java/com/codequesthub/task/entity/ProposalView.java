package com.codequesthub.task.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "proposals")
public class ProposalView {
    @Id
    private UUID id;

    @Column(name = "group_id")
    private UUID groupId;

    public UUID getId() { return id; }
    public UUID getGroupId() { return groupId; }
}
