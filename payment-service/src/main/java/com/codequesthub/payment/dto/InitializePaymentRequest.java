package com.codequesthub.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

public class InitializePaymentRequest {
    @NotNull
    private UUID groupId;

    // Matches the SHIRT_SIZES options offered in the frontend's picker
    // (GroupWorkspaceScreen.tsx) — keep both in sync if this ever changes.
    @NotBlank
    @Pattern(regexp = "S|M|L|XL|XXL", message = "must be one of: S, M, L, XL, XXL")
    private String shirtSize;

    public UUID getGroupId() { return groupId; }
    public void setGroupId(UUID v) { this.groupId = v; }
    public String getShirtSize() { return shirtSize; }
    public void setShirtSize(String v) { this.shirtSize = v; }
}
