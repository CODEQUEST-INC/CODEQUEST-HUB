package com.codequesthub.showcase.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "proposals")
public class ProposalView {
    @Id
    private UUID id;

    @Column(name = "group_id")
    private UUID groupId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", columnDefinition = "proposal_status")
    private ProposalStatus status;

    public UUID getId() { return id; }
    public UUID getGroupId() { return groupId; }
    public ProposalStatus getStatus() { return status; }
}
