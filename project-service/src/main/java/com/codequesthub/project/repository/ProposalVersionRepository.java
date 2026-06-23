package com.codequesthub.project.repository;

import com.codequesthub.project.entity.ProposalVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProposalVersionRepository extends JpaRepository<ProposalVersion, UUID> {
    List<ProposalVersion> findByProposalIdOrderByVersionNumberAsc(UUID proposalId);
}
