package com.codequesthub.group.repository;

import com.codequesthub.group.entity.UserRole;
import com.codequesthub.group.entity.UserView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface UserViewRepository extends JpaRepository<UserView, UUID> {
    List<UserView> findByCohortIdAndRole(UUID cohortId, UserRole role);
}
