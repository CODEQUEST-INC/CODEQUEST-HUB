package com.codequesthub.group.repository;

import com.codequesthub.group.entity.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {

    List<GroupMember> findByGroupId(UUID groupId);

    List<GroupMember> findByGroupIdIn(List<UUID> groupIds);

    boolean existsByGroupIdAndUserId(UUID groupId, UUID userId);

    void deleteByGroupIdAndUserId(UUID groupId, UUID userId);

    @Query("SELECT gm FROM GroupMember gm WHERE gm.userId = :userId")
    Optional<GroupMember> findByUserId(@Param("userId") UUID userId);
}
