package com.codequesthub.group.repository;

import com.codequesthub.group.entity.JudgeView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface JudgeViewRepository extends JpaRepository<JudgeView, UUID> {
    boolean existsByCohortId(UUID cohortId);
}
