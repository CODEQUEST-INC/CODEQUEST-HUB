package com.codequesthub.payment.repository;

import com.codequesthub.payment.entity.PaymentRegistration;
import com.codequesthub.payment.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRegistrationRepository extends JpaRepository<PaymentRegistration, UUID> {
    Optional<PaymentRegistration> findByReference(String reference);
    boolean existsByEmailAndStatusIn(String email, Collection<PaymentStatus> statuses);
}