package com.codequesthub.auth.entity;

import jakarta.persistence.*;
import java.util.UUID;

// Read-only view onto task-service's tasks table — created_by has no ON DELETE
// clause (would raw-FK-violate a hard delete); assignee_id is ON DELETE SET NULL
// but is still treated as a blocker here, matching the "block, never silently
// orphan" convention used everywhere else in this codebase (see CohortService).
@Entity
@Table(name = "tasks")
public class TaskView {
    @Id
    private UUID id;

    @Column(name = "assignee_id")
    private UUID assigneeId;

    @Column(name = "created_by")
    private UUID createdBy;

    public UUID getId() { return id; }
    public UUID getAssigneeId() { return assigneeId; }
    public UUID getCreatedBy() { return createdBy; }
}
