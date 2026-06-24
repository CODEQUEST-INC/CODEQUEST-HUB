package com.codequesthub.judging.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class UpdateCriterionRequest {

    @NotBlank
    private String name;

    @NotNull
    @DecimalMin(value = "0.01")
    @DecimalMax(value = "100")
    private BigDecimal weight;

    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public BigDecimal getWeight() { return weight; }
    public void setWeight(BigDecimal v) { this.weight = v; }
}
