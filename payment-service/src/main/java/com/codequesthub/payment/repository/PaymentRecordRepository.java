package com.codequesthub.payment.repository;

import com.codequesthub.payment.entity.PaymentRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRecordRepository extends JpaRepository<PaymentRecord, UUID> {
    Optional<PaymentRecord> findByPaystackReference(String paystackReference);
    Optional<PaymentRecord> findTopByGroupIdAndUserIdOrderByCreatedAtDesc(UUID groupId, UUID userId);
    List<PaymentRecord> findByGroupIdAndUserIdOrderByCreatedAtDesc(UUID groupId, UUID userId);
    List<PaymentRecord> findByGroupIdOrderByCreatedAtDesc(UUID groupId);
    List<PaymentRecord> findByGroupIdInOrderByCreatedAtDesc(List<UUID> groupIds);
}
