package com.codequesthub.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class InitializePaymentRequest {
    @NotNull
    private UUID groupId;

    @NotBlank
    private String shirtSize;

    public UUID getGroupId() { return groupId; }
    public void setGroupId(UUID v) { this.groupId = v; }
    public String getShirtSize() { return shirtSize; }
    public void setShirtSize(String v) { this.shirtSize = v; }
}
