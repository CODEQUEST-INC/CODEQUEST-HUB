package com.codequesthub.payment.controller;

import com.codequesthub.payment.dto.InitializePaymentRequest;
import com.codequesthub.payment.dto.SetFeeConfigRequest;
import com.codequesthub.payment.service.PaymentService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

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

    // Any authenticated user may view the fee amount — only setting it is admin-only.
    @GetMapping("/fee-config")
    public ResponseEntity<?> getFeeConfig(@RequestParam UUID cohortId) {
        return ResponseEntity.ok(Map.of("data", paymentService.getFeeConfig(cohortId)));
    }

    @PatchMapping("/fee-config")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<?> setFeeConfig(@Valid @RequestBody SetFeeConfigRequest req) {
        return ResponseEntity.ok(Map.of("data",
            paymentService.setFeeConfig(req.getCohortId(), req.getAmountPesewas())));
    }

    @GetMapping("/cohort/{cohortId}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<?> cohortStatuses(@PathVariable UUID cohortId) {
        return ResponseEntity.ok(Map.of("data", paymentService.getCohortPaymentStatuses(cohortId)));
    }

    // student — must be a member of the group being paid for
    @PostMapping("/initialize")
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<?> initialize(@Valid @RequestBody InitializePaymentRequest req, Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        var result = paymentService.initializePayment(userId, req.getGroupId(), req.getShirtSize());
        return ResponseEntity.ok(Map.of("data", result));
    }

    @GetMapping("/verify/{reference}")
    public ResponseEntity<?> verify(@PathVariable String reference) {
        return ResponseEntity.ok(Map.of("data", paymentService.verifyPayment(reference)));
    }

    // the calling student's own payment status for this group
    @GetMapping("/mine/{groupId}")
    public ResponseEntity<?> myStatus(@PathVariable UUID groupId, Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        var status = paymentService.getMyPaymentStatus(groupId, userId).orElse(null);
        return ResponseEntity.ok(Map.of("data", status));
    }

    // per-member breakdown for the group — any member, the group's supervisor, or admin
    @GetMapping("/group/{groupId}/summary")
    public ResponseEntity<?> groupSummary(@PathVariable UUID groupId, Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        var summary = paymentService.getGroupPaymentSummary(groupId, userId, roleOf(auth));
        return ResponseEntity.ok(Map.of("data", summary));
    }

    private String roleOf(Authentication auth) {
        Claims claims = (Claims) auth.getDetails();
        return claims.get("role", String.class);
    }
}
