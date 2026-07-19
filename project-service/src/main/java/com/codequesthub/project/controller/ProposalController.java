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
import org.springframework.web.multipart.MultipartFile;

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

    // Student: submit new proposal — multipart because a PDF attachment is
    // required alongside the text fields.
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<?> submit(@Valid @ModelAttribute ProposalContentRequest req,
                                    @RequestParam("file") MultipartFile file,
                                    Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        Proposal p = proposalService.submitProposal(userId, req, file);
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

    // Student: resubmit after rejection/changes_requested — a fresh PDF is
    // required again, same as the initial submission.
    @PatchMapping(value = "/{proposalId}/resubmit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<?> resubmit(@PathVariable UUID proposalId,
                                       @Valid @ModelAttribute ProposalContentRequest req,
                                       @RequestParam("file") MultipartFile file,
                                       Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        Proposal p = proposalService.resubmitProposal(userId, proposalId, req, file);
        return ResponseEntity.ok(Map.of("data", p));
    }

    // Student: pull back a proposal that's still awaiting review, so it can
    // be edited and resubmitted before the supervisor has acted on it.
    @PatchMapping("/{proposalId}/withdraw")
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<?> withdraw(@PathVariable UUID proposalId, Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        Proposal p = proposalService.withdrawProposal(userId, proposalId);
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

    // public — opening a file externally can't attach an Authorization header
    @GetMapping("/pdfs/{filename}")
    public ResponseEntity<byte[]> getPdf(@PathVariable String filename) {
        byte[] bytes = proposalService.readPdf(filename);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"proposal.pdf\"")
            .body(bytes);
    }
}
