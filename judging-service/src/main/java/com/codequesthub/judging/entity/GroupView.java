package com.codequesthub.judging.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "groups")
public class GroupView {
    @Id
    private UUID id;

    @Column(name = "cohort_id")
    private UUID cohortId;

    @Column(name = "group_number")
    private Integer groupNumber;

    @Column(name = "name")
    private String name;

    public UUID getId() { return id; }
    public UUID getCohortId() { return cohortId; }
    public Integer getGroupNumber() { return groupNumber; }
    public String getName() { return name; }
}
