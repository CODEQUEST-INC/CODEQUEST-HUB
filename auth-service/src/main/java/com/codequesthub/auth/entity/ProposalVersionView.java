package com.codequesthub.auth.entity;

import jakarta.persistence.*;
import java.util.UUID;

// Read-only view onto project-service's proposal_versions table — actor_id has
// no ON DELETE clause, so it would otherwise block a hard delete with a raw
// FK-violation exception; checked here to block first with a clear message.
@Entity
@Table(name = "proposal_versions")
public class ProposalVersionView {
    @Id
    private UUID id;

    @Column(name = "actor_id")
    private UUID actorId;

    public UUID getId() { return id; }
    public UUID getActorId() { return actorId; }
}
