package com.codequesthub.group.repository;

import com.codequesthub.group.entity.JudgingCriterionView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface JudgingCriterionViewRepository extends JpaRepository<JudgingCriterionView, UUID> {
    boolean existsByCohortId(UUID cohortId);
}
