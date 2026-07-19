package com.codequesthub.auth.repository;

import com.codequesthub.auth.entity.CohortView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface CohortViewRepository extends JpaRepository<CohortView, UUID> {
}
