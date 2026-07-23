package com.codequesthub.auth.repository;

import com.codequesthub.auth.entity.ShowcaseEntryView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ShowcaseEntryViewRepository extends JpaRepository<ShowcaseEntryView, UUID> {
    boolean existsByCreatedBy(UUID createdBy);
}
