package com.codequesthub.auth.repository;

import com.codequesthub.auth.entity.ProposalView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ProposalViewRepository extends JpaRepository<ProposalView, UUID> {
    boolean existsBySubmittedBy(UUID submittedBy);
    boolean existsByReviewedBy(UUID reviewedBy);
}
