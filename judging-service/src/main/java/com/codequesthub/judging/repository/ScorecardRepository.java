package com.codequesthub.judging.repository;

import com.codequesthub.judging.entity.Scorecard;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScorecardRepository extends JpaRepository<Scorecard, UUID> {
    Optional<Scorecard> findByGroupIdAndJudgeId(UUID groupId, UUID judgeId);
    List<Scorecard> findByGroupId(UUID groupId);
    List<Scorecard> findByGroupIdIn(List<UUID> groupIds);
}
