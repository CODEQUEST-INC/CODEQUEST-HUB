package com.codequesthub.group.repository;

import com.codequesthub.group.entity.Cohort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface CohortRepository extends JpaRepository<Cohort, UUID> {
    List<Cohort> findByActiveTrue();

    // Only one cohort may be active at a time — used to clear every other
    // cohort in one statement right before activating the chosen one.
    @Modifying
    @Query("UPDATE Cohort c SET c.active = false WHERE c.id <> :exceptId")
    void deactivateAllExcept(UUID exceptId);
}
