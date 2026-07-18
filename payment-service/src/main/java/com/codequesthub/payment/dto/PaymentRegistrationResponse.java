package com.codequesthub.payment.dto;

import java.time.Instant;
import java.util.UUID;

public record PaymentRegistrationResponse(UUID id,
                                          String fullName,
                                          String email,
                                          String phoneNumber,
                                          String tshirtSize,
                                          Integer tshirtQuantity,
                                          long unitPriceKobo,
                                          long totalAmountKobo,
                                          String reference,
                                          String authorizationUrl,
                                          String accessCode,
                                          String status,
                                          Instant createdAt,
                                          Instant updatedAt) {
}