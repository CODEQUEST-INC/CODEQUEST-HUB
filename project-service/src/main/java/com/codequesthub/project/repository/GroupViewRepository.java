package com.codequesthub.project.repository;

import com.codequesthub.project.entity.GroupView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface GroupViewRepository extends JpaRepository<GroupView, UUID> {}
