package com.codequesthub.task.repository;

import com.codequesthub.task.entity.GroupMemberView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface GroupMemberRepository extends JpaRepository<GroupMemberView, UUID> {
    boolean existsByGroupIdAndUserId(UUID groupId, UUID userId);

    @Query("SELECT gm FROM GroupMemberView gm WHERE gm.userId = :userId")
    Optional<GroupMemberView> findByUserId(@Param("userId") UUID userId);
}
