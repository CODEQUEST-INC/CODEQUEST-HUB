package com.codequesthub.showcase.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "judging_criteria")
public class JudgingCriterionView {
    @Id
    private UUID id;

    @Column(name = "cohort_id")
    private UUID cohortId;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal weight;

    public UUID getId() { return id; }
    public UUID getCohortId() { return cohortId; }
    public BigDecimal getWeight() { return weight; }
}
