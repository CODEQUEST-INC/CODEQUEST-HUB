package com.codequesthub.group.repository;

import com.codequesthub.group.entity.Cohort;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface CohortRepository extends JpaRepository<Cohort, UUID> {}
