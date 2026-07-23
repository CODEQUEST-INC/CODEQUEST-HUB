package com.codequesthub.group.dto;

import java.util.UUID;

public class UpdateSupervisorRequest {
    // Nullable — a null supervisorId unassigns the group's supervisor.
    private UUID supervisorId;

    public UUID getSupervisorId() { return supervisorId; }
    public void setSupervisorId(UUID v) { this.supervisorId = v; }
}
