package com.codequesthub.project.controller;

import com.codequesthub.project.dto.*;
import com.codequesthub.project.entity.Proposal;
import com.codequesthub.project.service.ProposalService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/proposals")
public class ProposalController {

    private final ProposalService proposalService;

    public ProposalController(ProposalService proposalService) {
        this.proposalService = proposalService;
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "service", "project-service"));
    }

    // Student: submit new proposal
    @PostMapping
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<?> submit(@Valid @RequestBody ProposalContentRequest req,
                                    Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        Proposal p = proposalService.submitProposal(userId, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", p));
    }

    // Student: view their own group's proposal
    @GetMapping("/my")
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<?> getMyProposal(Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        return ResponseEntity.ok(Map.of("data", proposalService.getMyProposal(userId)));
    }

    // Supervisor: view all proposals for their groups
    @GetMapping("/supervisor")
    @PreAuthorize("hasRole('supervisor')")
    public ResponseEntity<?> getSupervisorProposals(Authentication auth) {
        UUID supervisorId = UUID.fromString((String) auth.getPrincipal());
        List<Proposal> proposals = proposalService.getSupervisorProposals(supervisorId);
        return ResponseEntity.ok(Map.of("data", proposals));
    }

    // Student: resubmit after rejection/changes_requested
    @PatchMapping("/{proposalId}/resubmit")
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<?> resubmit(@PathVariable UUID proposalId,
                                       @Valid @RequestBody ProposalContentRequest req,
                                       Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        Proposal p = proposalService.resubmitProposal(userId, proposalId, req);
        return ResponseEntity.ok(Map.of("data", p));
    }

    // Supervisor: approve / reject / request changes
    @PatchMapping("/{proposalId}/review")
    @PreAuthorize("hasRole('supervisor')")
    public ResponseEntity<?> review(@PathVariable UUID proposalId,
                                    @Valid @RequestBody ReviewRequest req,
                                    Authentication auth) {
        UUID supervisorId = UUID.fromString((String) auth.getPrincipal());
        Proposal p = proposalService.reviewProposal(supervisorId, proposalId, req);
        return ResponseEntity.ok(Map.of("data", p));
    }

    // Any authenticated user (students only own group): version history
    @GetMapping("/{proposalId}/history")
    public ResponseEntity<?> getHistory(@PathVariable UUID proposalId,
                                        Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        Claims claims = (Claims) auth.getDetails();
        String role = claims.get("role", String.class);
        Map<String, Object> history = proposalService.getProposalHistory(userId, role, proposalId);
        return ResponseEntity.ok(Map.of("data", history));
    }
}
