package com.codequesthub.payment.dto;

import java.time.Instant;
import java.util.UUID;

public record PaymentVerificationResponse(UUID id,
                                          String reference,
                                          String status,
                                          long amountKobo,
                                          String gatewayResponse,
                                          Long paystackTransactionId,
                                          Instant verifiedAt,
                                          Instant updatedAt) {
}