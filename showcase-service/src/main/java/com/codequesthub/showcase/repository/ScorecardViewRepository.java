package com.codequesthub.showcase.repository;

import com.codequesthub.showcase.entity.ScorecardView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ScorecardViewRepository extends JpaRepository<ScorecardView, UUID> {
    List<ScorecardView> findByGroupIdIn(List<UUID> groupIds);
}
