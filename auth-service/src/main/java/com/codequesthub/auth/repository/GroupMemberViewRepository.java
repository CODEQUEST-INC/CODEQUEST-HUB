package com.codequesthub.auth.repository;

import com.codequesthub.auth.entity.GroupMemberView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface GroupMemberViewRepository extends JpaRepository<GroupMemberView, UUID> {
    boolean existsByUserId(UUID userId);
}
