package com.codequesthub.payment.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "payment_fee_configs")
public class PaymentFeeConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "cohort_id", nullable = false)
    private UUID cohortId;

    @Column(name = "amount_pesewas", nullable = false)
    private int amountPesewas;

    @Column(nullable = false, length = 3)
    private String currency = "GHS";

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() { createdAt = updatedAt = OffsetDateTime.now(); }

    @PreUpdate
    protected void onUpdate() { updatedAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getCohortId() { return cohortId; }
    public void setCohortId(UUID v) { this.cohortId = v; }
    public int getAmountPesewas() { return amountPesewas; }
    public void setAmountPesewas(int v) { this.amountPesewas = v; }
    public String getCurrency() { return currency; }
    public void setCurrency(String v) { this.currency = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
