package com.codequesthub.showcase.repository;

import com.codequesthub.showcase.entity.JudgingCriterionView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface JudgingCriterionViewRepository extends JpaRepository<JudgingCriterionView, UUID> {
    List<JudgingCriterionView> findByCohortId(UUID cohortId);
}
