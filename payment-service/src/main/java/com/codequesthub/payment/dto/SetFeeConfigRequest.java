package com.codequesthub.payment.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class SetFeeConfigRequest {
    @NotNull
    private UUID cohortId;

    @Min(1)
    private int amountPesewas;

    public UUID getCohortId() { return cohortId; }
    public void setCohortId(UUID v) { this.cohortId = v; }
    public int getAmountPesewas() { return amountPesewas; }
    public void setAmountPesewas(int v) { this.amountPesewas = v; }
}
