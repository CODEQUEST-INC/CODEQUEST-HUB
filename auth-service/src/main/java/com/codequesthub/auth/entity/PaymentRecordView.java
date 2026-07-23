package com.codequesthub.auth.entity;

import jakarta.persistence.*;
import java.util.UUID;

// Read-only view onto payment-service's payment_records table — user_id has
// no ON DELETE clause, so it would otherwise block a hard delete with a raw
// FK-violation exception; checked here to block first with a clear message.
@Entity
@Table(name = "payment_records")
public class PaymentRecordView {
    @Id
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
}
