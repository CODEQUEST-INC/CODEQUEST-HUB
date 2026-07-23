package com.codequesthub.auth.repository;

import com.codequesthub.auth.entity.GroupView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface GroupViewRepository extends JpaRepository<GroupView, UUID> {
    boolean existsBySupervisorId(UUID supervisorId);
    boolean existsByGroupLeaderId(UUID groupLeaderId);
}
