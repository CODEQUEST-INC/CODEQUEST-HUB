package com.codequesthub.payment.repository;

import com.codequesthub.payment.entity.PaymentFeeConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaymentFeeConfigRepository extends JpaRepository<PaymentFeeConfig, UUID> {
    Optional<PaymentFeeConfig> findByCohortId(UUID cohortId);
}
