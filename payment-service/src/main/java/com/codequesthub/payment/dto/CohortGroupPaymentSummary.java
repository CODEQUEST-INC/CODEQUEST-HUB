package com.codequesthub.payment.dto;

import java.util.List;
import java.util.UUID;

public class CohortGroupPaymentSummary {
    private final UUID groupId;
    private final Integer groupNumber;
    private final String groupName;
    private final int totalMembers;
    private final int paidCount;
    private final boolean allPaid;
    private final List<MemberPaymentStatus> members;

    public CohortGroupPaymentSummary(UUID groupId, Integer groupNumber, String groupName, int totalMembers,
                                       int paidCount, boolean allPaid, List<MemberPaymentStatus> members) {
        this.groupId = groupId;
        this.groupNumber = groupNumber;
        this.groupName = groupName;
        this.totalMembers = totalMembers;
        this.paidCount = paidCount;
        this.allPaid = allPaid;
        this.members = members;
    }

    public UUID getGroupId() { return groupId; }
    public Integer getGroupNumber() { return groupNumber; }
    public String getGroupName() { return groupName; }
    public int getTotalMembers() { return totalMembers; }
    public int getPaidCount() { return paidCount; }
    public boolean isAllPaid() { return allPaid; }
    public List<MemberPaymentStatus> getMembers() { return members; }
}
