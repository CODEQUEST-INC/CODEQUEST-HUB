package com.codequesthub.payment.dto;

import java.util.List;
import java.util.UUID;

public class GroupPaymentSummary {
    private final UUID groupId;
    private final int totalMembers;
    private final int paidCount;
    private final boolean allPaid;
    private final List<MemberPaymentStatus> members;

    public GroupPaymentSummary(UUID groupId, int totalMembers, int paidCount, boolean allPaid,
                                List<MemberPaymentStatus> members) {
        this.groupId = groupId;
        this.totalMembers = totalMembers;
        this.paidCount = paidCount;
        this.allPaid = allPaid;
        this.members = members;
    }

    public UUID getGroupId() { return groupId; }
    public int getTotalMembers() { return totalMembers; }
    public int getPaidCount() { return paidCount; }
    public boolean isAllPaid() { return allPaid; }
    public List<MemberPaymentStatus> getMembers() { return members; }
}
