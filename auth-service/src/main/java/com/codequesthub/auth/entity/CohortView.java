package com.codequesthub.auth.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "cohorts")
public class CohortView {
    @Id
    private UUID id;

    @Column(name = "is_active")
    private boolean active;

    public UUID getId() { return id; }
    public boolean isActive() { return active; }
}
