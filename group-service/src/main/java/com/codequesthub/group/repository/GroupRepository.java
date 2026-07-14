package com.codequesthub.group.repository;

import com.codequesthub.group.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GroupRepository extends JpaRepository<Group, UUID> {
    boolean existsByCohortIdAndGroupNumber(UUID cohortId, Integer groupNumber);
    Optional<Group> findByCohortIdAndGroupNumber(UUID cohortId, Integer groupNumber);
    List<Group> findByCohortId(UUID cohortId);
}
