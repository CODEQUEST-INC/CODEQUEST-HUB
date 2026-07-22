package com.codequesthub.payment.repository;

import com.codequesthub.payment.entity.GroupMemberView;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GroupMemberRepository extends JpaRepository<GroupMemberView, UUID> {
    boolean existsByGroupIdAndUserId(UUID groupId, UUID userId);
    long countByGroupId(UUID groupId);
    List<GroupMemberView> findByGroupId(UUID groupId);
}
