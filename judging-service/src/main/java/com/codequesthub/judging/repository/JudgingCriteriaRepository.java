package com.codequesthub.judging.repository;

import com.codequesthub.judging.entity.JudgingCriterion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface JudgingCriteriaRepository extends JpaRepository<JudgingCriterion, UUID> {
    List<JudgingCriterion> findByCohortId(UUID cohortId);
}
