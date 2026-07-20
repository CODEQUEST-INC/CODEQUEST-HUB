package com.codequesthub.payment.dto;

import java.util.UUID;

public class GroupPaymentStatus {
    private final UUID groupId;
    private final Integer groupNumber;
    private final String groupName;
    private final String status;
    private final Integer amountPesewas;

    public GroupPaymentStatus(UUID groupId, Integer groupNumber, String groupName, String status, Integer amountPesewas) {
        this.groupId = groupId;
        this.groupNumber = groupNumber;
        this.groupName = groupName;
        this.status = status;
        this.amountPesewas = amountPesewas;
    }

    public UUID getGroupId() { return groupId; }
    public Integer getGroupNumber() { return groupNumber; }
    public String getGroupName() { return groupName; }
    public String getStatus() { return status; }
    public Integer getAmountPesewas() { return amountPesewas; }
}
