package com.codequesthub.project.repository;

import com.codequesthub.project.entity.GroupMemberView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;
import java.util.List;


public interface GroupMemberRepository extends JpaRepository<GroupMemberView, UUID> {
    boolean existsByGroupIdAndUserId(UUID groupId, UUID userId);

    @Query("SELECT gm FROM GroupMemberView gm WHERE gm.userId = :userId")
    Optional<GroupMemberView> findByUserId(@Param("userId") UUID userId);

    @Query("SELECT gm FROM GroupMemberView gm WHERE gm.groupId = :groupId")
    List<GroupMemberView> findByGroupId(@Param("groupId") UUID groupId);
}
