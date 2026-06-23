package com.codequesthub.task.repository;

import com.codequesthub.task.entity.ProposalView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ProposalViewRepository extends JpaRepository<ProposalView, UUID> {
    Optional<ProposalView> findByGroupId(UUID groupId);
}
