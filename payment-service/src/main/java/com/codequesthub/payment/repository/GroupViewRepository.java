package com.codequesthub.payment.repository;

import com.codequesthub.payment.entity.GroupView;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GroupViewRepository extends JpaRepository<GroupView, UUID> {
    List<GroupView> findByCohortId(UUID cohortId);
}
