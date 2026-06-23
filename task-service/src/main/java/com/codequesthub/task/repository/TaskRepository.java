package com.codequesthub.task.repository;

import com.codequesthub.task.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findByGroupIdOrderByCreatedAtDesc(UUID groupId);
}
