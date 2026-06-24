package com.codequesthub.judging.repository;

import com.codequesthub.judging.entity.ScorecardScore;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ScorecardScoreRepository extends JpaRepository<ScorecardScore, UUID> {
    boolean existsByCriterionId(UUID criterionId);
}
