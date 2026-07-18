package com.codequesthub.payment.dto;

import java.time.Instant;
import java.util.UUID;

public record PaymentInitializationResponse(UUID registrationId,
                                           String reference,
                                           String authorizationUrl,
                                           String accessCode,
                                           long amountKobo,
                                           String status,
                                           Instant createdAt) {
}