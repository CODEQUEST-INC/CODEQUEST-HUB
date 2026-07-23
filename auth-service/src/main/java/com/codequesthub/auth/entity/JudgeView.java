package com.codequesthub.auth.entity;

import jakarta.persistence.*;
import java.util.UUID;

// Read-only view onto judging-service's judges table — user_id is ON DELETE
// CASCADE, so a hard delete would otherwise silently destroy this judge
// assignment; treated as a blocker here instead, matching the "block, never
// silently cascade" convention used everywhere else in this codebase.
@Entity
@Table(name = "judges")
public class JudgeView {
    @Id
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
}
