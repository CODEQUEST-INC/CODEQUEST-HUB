package com.codequesthub.group.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "judges")
public class JudgeView {
    @Id
    private UUID id;

    @Column(name = "cohort_id")
    private UUID cohortId;

    public UUID getId() { return id; }
    public UUID getCohortId() { return cohortId; }
}
