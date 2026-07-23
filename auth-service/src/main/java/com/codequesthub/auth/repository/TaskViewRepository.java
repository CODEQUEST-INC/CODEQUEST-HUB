package com.codequesthub.auth.repository;

import com.codequesthub.auth.entity.TaskView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface TaskViewRepository extends JpaRepository<TaskView, UUID> {
    boolean existsByAssigneeId(UUID assigneeId);
    boolean existsByCreatedBy(UUID createdBy);
}
