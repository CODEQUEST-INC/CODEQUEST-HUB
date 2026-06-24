package com.codequesthub.showcase.repository;

import com.codequesthub.showcase.entity.GroupMemberView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface GroupMemberRepository extends JpaRepository<GroupMemberView, UUID> {
    boolean existsByGroupIdAndUserId(UUID groupId, UUID userId);
}
