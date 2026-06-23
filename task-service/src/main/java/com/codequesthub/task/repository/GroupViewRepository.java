package com.codequesthub.task.repository;

import com.codequesthub.task.entity.GroupView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface GroupViewRepository extends JpaRepository<GroupView, UUID> {}
