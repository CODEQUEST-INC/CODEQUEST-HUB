package com.codequesthub.auth.repository;

import com.codequesthub.auth.entity.ScorecardView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ScorecardViewRepository extends JpaRepository<ScorecardView, UUID> {
    boolean existsByJudgeId(UUID judgeId);
}
