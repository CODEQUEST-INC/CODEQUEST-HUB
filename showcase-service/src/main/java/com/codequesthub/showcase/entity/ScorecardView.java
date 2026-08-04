package com.codequesthub.showcase.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "scorecards")
public class ScorecardView {
    @Id
    private UUID id;

    @Column(name = "group_id")
    private UUID groupId;

    @OneToMany(mappedBy = "scorecard", fetch = FetchType.EAGER)
    private List<ScorecardScoreView> scores = new ArrayList<>();

    public UUID getId() { return id; }
    public UUID getGroupId() { return groupId; }
    public List<ScorecardScoreView> getScores() { return scores; }
}
