package com.codequesthub.auth.repository;

import com.codequesthub.auth.entity.JudgeView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface JudgeViewRepository extends JpaRepository<JudgeView, UUID> {
    boolean existsByUserId(UUID userId);
}
