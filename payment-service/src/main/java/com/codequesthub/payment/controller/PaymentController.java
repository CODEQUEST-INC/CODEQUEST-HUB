package com.codequesthub.payment.controller;

import com.codequesthub.payment.dto.PaymentRegistrationRequest;
import com.codequesthub.payment.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "service", "payment-service"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody PaymentRegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", paymentService.registerAndInitialize(request)));
    }

    @GetMapping("/{reference}")
    public ResponseEntity<?> getByReference(@PathVariable String reference) {
        return ResponseEntity.ok(Map.of("data", paymentService.getRegistration(reference)));
    }

    @PostMapping("/verify/{reference}")
    public ResponseEntity<?> verify(@PathVariable String reference) {
        return ResponseEntity.ok(Map.of("data", paymentService.verify(reference)));
    }

    @PostMapping(value = "/webhook", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> webhook(@RequestHeader(value = "x-paystack-signature", required = false) String signature,
                                     @RequestBody String payload) {
        paymentService.handleWebhook(signature, payload);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}