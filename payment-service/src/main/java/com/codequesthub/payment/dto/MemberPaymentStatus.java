package com.codequesthub.payment.dto;

import java.util.UUID;

public class MemberPaymentStatus {
    private final UUID userId;
    private final String status;
    private final String shirtSize;

    public MemberPaymentStatus(UUID userId, String status, String shirtSize) {
        this.userId = userId;
        this.status = status;
        this.shirtSize = shirtSize;
    }

    public UUID getUserId() { return userId; }
    public String getStatus() { return status; }
    public String getShirtSize() { return shirtSize; }
}
