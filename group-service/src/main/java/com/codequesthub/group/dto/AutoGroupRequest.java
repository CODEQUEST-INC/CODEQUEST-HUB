package com.codequesthub.group.dto;

import jakarta.validation.constraints.*;

public class AutoGroupRequest {
    @NotNull @Min(1)
    private Integer groupSize;

    public Integer getGroupSize() { return groupSize; }
    public void setGroupSize(Integer v) { this.groupSize = v; }
}
