package com.codequesthub.project.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "groups")
public class GroupView {
    @Id
    private UUID id;

    @Column(name = "supervisor_id")
    private UUID supervisorId;

    public UUID getId() { return id; }
    public UUID getSupervisorId() { return supervisorId; }
}
