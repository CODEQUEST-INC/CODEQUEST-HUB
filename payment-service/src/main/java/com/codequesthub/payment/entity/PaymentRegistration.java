package com.codequesthub.payment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_registrations")
public class PaymentRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(nullable = false, length = 50)
    private String phoneNumber;

    @Column(nullable = false, length = 20)
    private String tshirtSize;

    @Column(nullable = false)
    private Integer tshirtQuantity;

    @Column(nullable = false)
    private long unitPriceKobo;

    @Column(nullable = false)
    private long totalAmountKobo;

    @Column(nullable = false, unique = true, length = 100)
    private String reference;

    @Column(length = 500)
    private String authorizationUrl;

    @Column(length = 120)
    private String accessCode;

    @Column
    private Long paystackTransactionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentStatus status;

    @Column(length = 120)
    private String gatewayResponse;

    @Column
    private Instant verifiedAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getTshirtSize() {
        return tshirtSize;
    }

    public void setTshirtSize(String tshirtSize) {
        this.tshirtSize = tshirtSize;
    }

    public Integer getTshirtQuantity() {
        return tshirtQuantity;
    }

    public void setTshirtQuantity(Integer tshirtQuantity) {
        this.tshirtQuantity = tshirtQuantity;
    }

    public long getUnitPriceKobo() {
        return unitPriceKobo;
    }

    public void setUnitPriceKobo(long unitPriceKobo) {
        this.unitPriceKobo = unitPriceKobo;
    }

    public long getTotalAmountKobo() {
        return totalAmountKobo;
    }

    public void setTotalAmountKobo(long totalAmountKobo) {
        this.totalAmountKobo = totalAmountKobo;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getAuthorizationUrl() {
        return authorizationUrl;
    }

    public void setAuthorizationUrl(String authorizationUrl) {
        this.authorizationUrl = authorizationUrl;
    }

    public String getAccessCode() {
        return accessCode;
    }

    public void setAccessCode(String accessCode) {
        this.accessCode = accessCode;
    }

    public Long getPaystackTransactionId() {
        return paystackTransactionId;
    }

    public void setPaystackTransactionId(Long paystackTransactionId) {
        this.paystackTransactionId = paystackTransactionId;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public void setStatus(PaymentStatus status) {
        this.status = status;
    }

    public String getGatewayResponse() {
        return gatewayResponse;
    }

    public void setGatewayResponse(String gatewayResponse) {
        this.gatewayResponse = gatewayResponse;
    }

    public Instant getVerifiedAt() {
        return verifiedAt;
    }

    public void setVerifiedAt(Instant verifiedAt) {
        this.verifiedAt = verifiedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}