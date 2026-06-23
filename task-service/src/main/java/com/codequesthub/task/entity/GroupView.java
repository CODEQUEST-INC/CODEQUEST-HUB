package com.codequesthub.task.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "groups")
public class GroupView {
    @Id
    private UUID id;

    @Column(name = "supervisor_id")
    private UUID supervisorId;

    @Column(name = "group_leader_id")
    private UUID groupLeaderId;

    public UUID getId() { return id; }
    public UUID getSupervisorId() { return supervisorId; }
    public UUID getGroupLeaderId() { return groupLeaderId; }
}
