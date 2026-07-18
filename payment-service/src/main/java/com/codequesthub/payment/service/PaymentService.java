package com.codequesthub.payment.service;

import com.codequesthub.payment.client.PaystackClient;
import com.codequesthub.payment.dto.PaymentInitializationResponse;
import com.codequesthub.payment.dto.PaymentRegistrationRequest;
import com.codequesthub.payment.dto.PaymentRegistrationResponse;
import com.codequesthub.payment.dto.PaymentVerificationResponse;
import com.codequesthub.payment.entity.PaymentRegistration;
import com.codequesthub.payment.entity.PaymentStatus;
import com.codequesthub.payment.repository.PaymentRegistrationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {

    private final PaymentRegistrationRepository repository;
    private final PaystackClient paystackClient;
    private final ObjectMapper objectMapper;
    private final long unitPriceKobo;
    private final String currency;
    private final String callbackUrl;

    public PaymentService(PaymentRegistrationRepository repository,
                          PaystackClient paystackClient,
                          ObjectMapper objectMapper,
                          @Value("${payment.unit-price-kobo:10000}") long unitPriceKobo,
                          @Value("${payment.currency:GHS}") String currency,
                          @Value("${payment.callback-url:}") String callbackUrl) {
        this.repository = repository;
        this.paystackClient = paystackClient;
        this.objectMapper = objectMapper;
        this.unitPriceKobo = unitPriceKobo;
        this.currency = currency;
        this.callbackUrl = callbackUrl;
    }

    public PaymentInitializationResponse registerAndInitialize(PaymentRegistrationRequest request) {
        if (repository.existsByEmailAndStatusIn(request.email(), List.of(PaymentStatus.PENDING, PaymentStatus.INITIATED, PaymentStatus.PAID))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A registration already exists for this email");
        }

        PaymentRegistration registration = new PaymentRegistration();
        registration.setFullName(request.fullName());
        registration.setEmail(request.email());
        registration.setPhoneNumber(request.phoneNumber());
        registration.setTshirtSize(request.tshirtSize());
        registration.setTshirtQuantity(request.tshirtQuantity());
        registration.setUnitPriceKobo(unitPriceKobo);
        registration.setTotalAmountKobo(unitPriceKobo * request.tshirtQuantity());
        registration.setReference(generateReference());
        registration.setStatus(PaymentStatus.PENDING);
        registration = repository.save(registration);

        Map<String, Object> metadata = Map.of(
            "registrationId", registration.getId().toString(),
            "fullName", registration.getFullName(),
            "phoneNumber", registration.getPhoneNumber(),
            "tshirtSize", registration.getTshirtSize(),
            "tshirtQuantity", registration.getTshirtQuantity(),
            "currency", currency
        );

        try {
            PaystackClient.PaystackInitializeResult init = paystackClient.initializeTransaction(
                registration.getEmail(),
                registration.getTotalAmountKobo(),
                registration.getReference(),
                request.callbackUrl() != null && !request.callbackUrl().isBlank() ? request.callbackUrl() : callbackUrl,
                metadata
            );

            if (!init.success() || init.authorizationUrl() == null || init.authorizationUrl().isBlank()) {
                registration.setStatus(PaymentStatus.FAILED);
                repository.save(registration);
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, init.message().isBlank() ? "Unable to initialize Paystack transaction" : init.message());
            }

            registration.setAuthorizationUrl(init.authorizationUrl());
            registration.setAccessCode(init.accessCode());
            registration.setStatus(PaymentStatus.INITIATED);
            repository.save(registration);

            return new PaymentInitializationResponse(
                registration.getId(),
                registration.getReference(),
                registration.getAuthorizationUrl(),
                registration.getAccessCode(),
                registration.getTotalAmountKobo(),
                registration.getStatus().name(),
                registration.getCreatedAt()
            );
        } catch (Exception ex) {
            registration.setStatus(PaymentStatus.FAILED);
            repository.save(registration);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to initialize Paystack transaction", ex);
        }
    }

    public PaymentRegistrationResponse getRegistration(String reference) {
        return toRegistrationResponse(findByReference(reference));
    }

    public PaymentVerificationResponse verify(String reference) {
        PaymentRegistration registration = findByReference(reference);
        PaystackClient.PaystackVerificationResult verification = paystackClient.verifyTransaction(reference);

        if (!verification.success() || verification.status() == null || !"success".equalsIgnoreCase(verification.status())) {
            registration.setStatus(PaymentStatus.FAILED);
            registration.setGatewayResponse(verification.gatewayResponse());
            repository.save(registration);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, verification.message().isBlank() ? "Payment not verified" : verification.message());
        }

        if (verification.amount() > 0 && verification.amount() != registration.getTotalAmountKobo()) {
            registration.setStatus(PaymentStatus.FAILED);
            registration.setGatewayResponse("Amount mismatch");
            repository.save(registration);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verified amount does not match expected amount");
        }

        registration.setStatus(PaymentStatus.PAID);
        registration.setGatewayResponse(verification.gatewayResponse());
        registration.setPaystackTransactionId(verification.transactionId());
        registration.setVerifiedAt(Instant.now());
        repository.save(registration);

        return new PaymentVerificationResponse(
            registration.getId(),
            registration.getReference(),
            registration.getStatus().name(),
            registration.getTotalAmountKobo(),
            registration.getGatewayResponse(),
            registration.getPaystackTransactionId(),
            registration.getVerifiedAt(),
            registration.getUpdatedAt()
        );
    }

    public void handleWebhook(String signature, String rawPayload) {
        if (!paystackClient.isValidWebhook(rawPayload, signature)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Paystack signature");
        }

        try {
            JsonNode payload = objectMapper.readTree(rawPayload);
            String event = payload.path("event").asText("");
            String reference = payload.path("data").path("reference").asText("");

            if ("charge.success".equalsIgnoreCase(event) && !reference.isBlank()) {
                verify(reference);
            }
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to process webhook payload", ex);
        }
    }

    private PaymentRegistration findByReference(String reference) {
        return repository.findByReference(reference)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment registration not found"));
    }

    private PaymentRegistrationResponse toRegistrationResponse(PaymentRegistration registration) {
        return new PaymentRegistrationResponse(
            registration.getId(),
            registration.getFullName(),
            registration.getEmail(),
            registration.getPhoneNumber(),
            registration.getTshirtSize(),
            registration.getTshirtQuantity(),
            registration.getUnitPriceKobo(),
            registration.getTotalAmountKobo(),
            registration.getReference(),
            registration.getAuthorizationUrl(),
            registration.getAccessCode(),
            registration.getStatus().name(),
            registration.getCreatedAt(),
            registration.getUpdatedAt()
        );
    }

    private String generateReference() {
        return "cqhp_" + UUID.randomUUID().toString().replace("-", "");
    }
}