package com.codequesthub.payment.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PaymentRegistrationRequest(
    @NotBlank String fullName,
    @Email @NotBlank String email,
    @NotBlank String phoneNumber,
    @NotBlank String tshirtSize,
    @NotNull @Min(1) Integer tshirtQuantity,
    String callbackUrl
) {
}