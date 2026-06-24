package com.codequesthub.judging.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "cohorts")
public class CohortView {
    @Id
    private UUID id;

    public UUID getId() { return id; }
}
