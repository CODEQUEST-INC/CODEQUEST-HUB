package com.codequesthub.auth.repository;

import com.codequesthub.auth.entity.PaymentRecordView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface PaymentRecordViewRepository extends JpaRepository<PaymentRecordView, UUID> {
    boolean existsByUserId(UUID userId);
}
