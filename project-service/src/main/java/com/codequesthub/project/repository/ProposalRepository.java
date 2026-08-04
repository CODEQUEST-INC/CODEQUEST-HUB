package com.codequesthub.project.repository;

import com.codequesthub.project.entity.Proposal;
import com.codequesthub.project.entity.ProposalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProposalRepository extends JpaRepository<Proposal, UUID> {
    Optional<Proposal> findByGroupId(UUID groupId);

    long countByStatusIn(List<ProposalStatus> statuses);

    @Query(value = """
        SELECT p.* FROM proposals p
        JOIN groups g ON g.id = p.group_id
        JOIN group_members gm ON gm.group_id = g.id
        WHERE gm.user_id = :userId
        """, nativeQuery = true)
    Optional<Proposal> findByMemberId(@Param("userId") UUID userId);

    @Query(value = """
        SELECT p.* FROM proposals p
        JOIN groups g ON g.id = p.group_id
        WHERE g.supervisor_id = :supervisorId
        ORDER BY p.updated_at DESC
        """, nativeQuery = true)
    List<Proposal> findBySupervisorId(@Param("supervisorId") UUID supervisorId);
}
