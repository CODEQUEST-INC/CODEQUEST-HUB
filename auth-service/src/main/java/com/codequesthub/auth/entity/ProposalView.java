package com.codequesthub.auth.entity;

import jakarta.persistence.*;
import java.util.UUID;

// Read-only view onto project-service's proposals table — submitted_by and
// reviewed_by have no ON DELETE clause, so a hard delete would otherwise fail
// with a raw FK-violation exception; checked here to block first with a clear message.
@Entity
@Table(name = "proposals")
public class ProposalView {
    @Id
    private UUID id;

    @Column(name = "submitted_by")
    private UUID submittedBy;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    public UUID getId() { return id; }
    public UUID getSubmittedBy() { return submittedBy; }
    public UUID getReviewedBy() { return reviewedBy; }
}
