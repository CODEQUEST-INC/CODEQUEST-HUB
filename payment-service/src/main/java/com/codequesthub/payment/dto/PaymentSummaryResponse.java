package com.codequesthub.payment.dto;

// Sitewide fee collection summary across every cohort that has a fee
// configured — backs the Admin Hub's "Fee collection" card. Cohorts with no
// fee configured yet don't factor in (nothing is "expected" from them).
public class PaymentSummaryResponse {

    private final long collectedPesewas;
    private final long expectedPesewas;
    private final int outstandingCount;

    public PaymentSummaryResponse(long collectedPesewas, long expectedPesewas, int outstandingCount) {
        this.collectedPesewas = collectedPesewas;
        this.expectedPesewas = expectedPesewas;
        this.outstandingCount = outstandingCount;
    }

    public long getCollectedPesewas() { return collectedPesewas; }
    public long getExpectedPesewas() { return expectedPesewas; }
    public int getOutstandingCount() { return outstandingCount; }
}
