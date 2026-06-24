package com.codequesthub.showcase.repository;

import com.codequesthub.showcase.entity.ShowcaseEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShowcaseEntryRepository extends JpaRepository<ShowcaseEntry, UUID> {
    Optional<ShowcaseEntry> findByGroupId(UUID groupId);
    List<ShowcaseEntry> findByCohortIdOrderByCreatedAtDesc(UUID cohortId);
    List<ShowcaseEntry> findAllByOrderByCreatedAtDesc();
}
