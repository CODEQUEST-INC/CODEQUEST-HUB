package com.codequesthub.judging.repository;

import com.codequesthub.judging.entity.CohortView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface CohortViewRepository extends JpaRepository<CohortView, UUID> {}
