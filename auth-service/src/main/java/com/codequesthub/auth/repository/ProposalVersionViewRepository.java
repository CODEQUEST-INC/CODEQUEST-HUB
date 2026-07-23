package com.codequesthub.auth.repository;

import com.codequesthub.auth.entity.ProposalVersionView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ProposalVersionViewRepository extends JpaRepository<ProposalVersionView, UUID> {
    boolean existsByActorId(UUID actorId);
}
