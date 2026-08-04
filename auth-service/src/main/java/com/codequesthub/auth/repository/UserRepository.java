package com.codequesthub.auth.repository;

import com.codequesthub.auth.entity.User;
import com.codequesthub.auth.entity.UserRole;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByRole(UserRole role);
    Optional<User> findByResetToken(String resetToken);

    // Caller passes a capped Pageable (e.g. top 20) — this backs an admin-facing
    // type-ahead picker, not a full directory browse.
    //
    // Split into two methods rather than "(:role IS NULL OR u.role = :role)" —
    // pgjdbc can't infer the parameter type for a native enum column when the
    // same bind param also appears in an untyped "IS NULL" branch ("could not
    // determine data type of parameter").
    @Query("SELECT u FROM User u WHERE "
        + "(LOWER(u.fullName) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))) "
        + "ORDER BY u.fullName")
    List<User> search(@Param("q") String q, Pageable pageable);

    @Query("SELECT u FROM User u WHERE "
        + "(LOWER(u.fullName) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))) "
        + "AND u.role = :role "
        + "ORDER BY u.fullName")
    List<User> searchByRole(@Param("q") String q, @Param("role") UserRole role, Pageable pageable);
}
