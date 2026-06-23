package com.codequesthub.group.dto;

import jakarta.validation.constraints.*;
import java.util.UUID;

public class CreateGroupRequest {
    @NotNull private UUID cohortId;
    @NotNull @Positive private Integer groupNumber;
    @Size(max = 150) private String name;
    private UUID supervisorId;

    public UUID getCohortId() { return cohortId; }
    public void setCohortId(UUID v) { this.cohortId = v; }
    public Integer getGroupNumber() { return groupNumber; }
    public void setGroupNumber(Integer v) { this.groupNumber = v; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public UUID getSupervisorId() { return supervisorId; }
    public void setSupervisorId(UUID v) { this.supervisorId = v; }
}
