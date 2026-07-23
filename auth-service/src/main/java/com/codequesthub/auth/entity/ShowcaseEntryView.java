package com.codequesthub.auth.entity;

import jakarta.persistence.*;
import java.util.UUID;

// Read-only view onto showcase-service's showcase_entries table — created_by
// has no ON DELETE clause, so it would otherwise block a hard delete with a
// raw FK-violation exception; checked here to block first with a clear message.
@Entity
@Table(name = "showcase_entries")
public class ShowcaseEntryView {
    @Id
    private UUID id;

    @Column(name = "created_by")
    private UUID createdBy;

    public UUID getId() { return id; }
    public UUID getCreatedBy() { return createdBy; }
}
