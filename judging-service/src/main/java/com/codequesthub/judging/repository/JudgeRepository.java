package com.codequesthub.judging.repository;

import com.codequesthub.judging.entity.Judge;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JudgeRepository extends JpaRepository<Judge, UUID> {
    List<Judge> findByCohortId(UUID cohortId);
    boolean existsByCohortIdAndUserId(UUID cohortId, UUID userId);
    Optional<Judge> findByCohortIdAndUserId(UUID cohortId, UUID userId);
}
