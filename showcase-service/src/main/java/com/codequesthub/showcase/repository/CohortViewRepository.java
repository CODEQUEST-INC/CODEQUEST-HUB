package com.codequesthub.showcase.repository;

import com.codequesthub.showcase.entity.CohortView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface CohortViewRepository extends JpaRepository<CohortView, UUID> {}
