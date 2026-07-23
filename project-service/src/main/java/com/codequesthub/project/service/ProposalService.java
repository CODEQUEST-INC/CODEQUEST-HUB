package com.codequesthub.project.service;

import com.codequesthub.project.dto.*;
import com.codequesthub.project.entity.*;
import com.codequesthub.project.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import com.codequesthub.project.client.NotificationClient;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Service
public class ProposalService {

    private final ProposalRepository proposalRepo;
    private final ProposalVersionRepository versionRepo;
    private final GroupMemberRepository memberRepo;
    private final GroupViewRepository groupViewRepo;
    private final NotificationClient notificationClient;
    private final Path uploadDir;

    public ProposalService(ProposalRepository proposalRepo,
                           ProposalVersionRepository versionRepo,
                           GroupMemberRepository memberRepo,
                           GroupViewRepository groupViewRepo,
                           NotificationClient notificationClient,
                           @Value("${project.upload-dir}") String uploadDir) {
        this.proposalRepo = proposalRepo;
        this.versionRepo = versionRepo;
        this.memberRepo = memberRepo;
        this.groupViewRepo = groupViewRepo;
        this.notificationClient = notificationClient;
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create proposal upload directory: " + uploadDir, e);
        }
    }

    // Helper: notify every member of a group
    private void notifyGroup(UUID groupId, String type, String title, String message, UUID relatedEntityId) {
        memberRepo.findByGroupId(groupId).forEach(member ->
            notificationClient.send(member.getUserId(), type, title, message, relatedEntityId)
        );
    }

    @Transactional
    public Proposal submitProposal(UUID userId, ProposalContentRequest req, MultipartFile pdf) {
        // Find the group the student belongs to
        GroupMemberView membership = memberRepo.findByUserId(userId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "You are not assigned to a group"));

        UUID groupId = membership.getGroupId();

        // One proposal per group
        if (proposalRepo.findByGroupId(groupId).isPresent()) {
            Proposal existing = proposalRepo.findByGroupId(groupId).get();
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Your group already has a proposal (status: " + existing.getStatus().name() +
                "). Use PATCH /api/proposals/" + existing.getId() + "/resubmit to update it.");
        }

        String pdfPath = storePdf(pdf);

        Proposal p = new Proposal();
        p.setGroupId(groupId);
        p.setTitle(req.getTitle());
        p.setProblemStatement(req.getProblemStatement());
        p.setObjectives(req.getObjectives());
        p.setTechStack(req.getTechStack());
        p.setPdfPath(pdfPath);
        p.setStatus(ProposalStatus.submitted);
        p.setCurrentVersion(1);
        p.setSubmittedBy(userId);
        p = proposalRepo.save(p);

        saveVersion(p.getId(), 1, req, pdfPath, "submitted", userId, null);

        notifyGroup(groupId, "PROPOSAL_PENDING", "Proposal Submitted",
            "Your proposal \"" + p.getTitle() + "\" has been submitted and is awaiting review.", p.getId());

        return p;
    }

    @Transactional
    public Proposal resubmitProposal(UUID userId, UUID proposalId, ProposalContentRequest req, MultipartFile pdf) {
        Proposal proposal = proposalRepo.findById(proposalId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proposal not found"));

        if (!memberRepo.existsByGroupIdAndUserId(proposal.getGroupId(), userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You are not a member of this proposal's group");
        }

        if (proposal.getStatus() != ProposalStatus.changes_requested &&
            proposal.getStatus() != ProposalStatus.rejected &&
            proposal.getStatus() != ProposalStatus.draft) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Cannot resubmit a proposal with status \"" + proposal.getStatus().name() +
                "\". Resubmission is only allowed after withdrawing, rejection, or a request for changes.");
        }

        String oldPdfPath = proposal.getPdfPath();
        String pdfPath = storePdf(pdf);

        int newVersion = proposal.getCurrentVersion() + 1;
        proposal.setTitle(req.getTitle());
        proposal.setProblemStatement(req.getProblemStatement());
        proposal.setObjectives(req.getObjectives());
        proposal.setTechStack(req.getTechStack());
        proposal.setPdfPath(pdfPath);
        proposal.setStatus(ProposalStatus.submitted);
        proposal.setCurrentVersion(newVersion);
        proposal.setSubmittedBy(userId);
        proposal = proposalRepo.save(proposal);

        saveVersion(proposal.getId(), newVersion, req, pdfPath, "submitted", userId, null);

        notifyGroup(proposal.getGroupId(), "PROPOSAL_PENDING", "Proposal Resubmitted",
            "Your proposal \"" + proposal.getTitle() + "\" has been resubmitted and is awaiting review.", proposal.getId());

        if (oldPdfPath != null) {
            deleteFileQuietly(oldPdfPath);
        }
        return proposal;
    }

    // Student: pull a proposal back before the supervisor has acted on it, so
    // it can be edited and resubmitted like one that was rejected.
    @Transactional
    public Proposal withdrawProposal(UUID userId, UUID proposalId) {
        Proposal proposal = proposalRepo.findById(proposalId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proposal not found"));

        if (!memberRepo.existsByGroupIdAndUserId(proposal.getGroupId(), userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You are not a member of this proposal's group");
        }

        if (proposal.getStatus() != ProposalStatus.submitted &&
            proposal.getStatus() != ProposalStatus.under_review) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Cannot withdraw a proposal with status \"" + proposal.getStatus().name() +
                "\". Only proposals awaiting review can be withdrawn.");
        }

        int newVersion = proposal.getCurrentVersion() + 1;
        proposal.setStatus(ProposalStatus.draft);
        proposal.setCurrentVersion(newVersion);
        proposal = proposalRepo.save(proposal);

        ProposalContentRequest snapshot = new ProposalContentRequest();
        snapshot.setTitle(proposal.getTitle());
        snapshot.setProblemStatement(proposal.getProblemStatement());
        snapshot.setObjectives(proposal.getObjectives());
        snapshot.setTechStack(proposal.getTechStack());
        saveVersion(proposal.getId(), newVersion, snapshot, proposal.getPdfPath(), "withdrawn", userId, null);
        return proposal;
    }

    @Transactional
    public Proposal reviewProposal(UUID supervisorId, UUID proposalId, ReviewRequest req) {
        if (!req.isValid()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Written feedback is required when rejecting or requesting changes");
        }

        Proposal proposal = proposalRepo.findById(proposalId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proposal not found"));

        GroupView group = groupViewRepo.findById(proposal.getGroupId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));

        if (!supervisorId.equals(group.getSupervisorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You are not the assigned supervisor for this group");
        }

        if (proposal.getStatus() != ProposalStatus.submitted &&
            proposal.getStatus() != ProposalStatus.under_review) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Cannot review a proposal with status \"" + proposal.getStatus().name() + "\"");
        }

        int newVersion = proposal.getCurrentVersion() + 1;
        proposal.setStatus(ProposalStatus.valueOf(req.getAction()));
        proposal.setReviewedBy(supervisorId);
        proposal.setCurrentVersion(newVersion);
        proposal = proposalRepo.save(proposal);

        // Snapshot current content for the version record — review doesn't
        // change the text/PDF, just the status, so both carry over as-is.
        ProposalContentRequest snapshot = new ProposalContentRequest();
        snapshot.setTitle(proposal.getTitle());
        snapshot.setProblemStatement(proposal.getProblemStatement());
        snapshot.setObjectives(proposal.getObjectives());
        snapshot.setTechStack(proposal.getTechStack());
        saveVersion(proposal.getId(), newVersion, snapshot, proposal.getPdfPath(), req.getAction(), supervisorId, req.getFeedback());

        if ("approved".equals(req.getAction())) {
            notifyGroup(proposal.getGroupId(), "PROPOSAL_APPROVED", "Proposal Approved",
                "Great news! Your proposal \"" + proposal.getTitle() + "\" has been approved.", proposal.getId());
        } else if ("rejected".equals(req.getAction())) {
            notifyGroup(proposal.getGroupId(), "PROPOSAL_REJECTED", "Proposal Rejected",
                "Your proposal \"" + proposal.getTitle() + "\" was rejected. Feedback: " + req.getFeedback(), proposal.getId());
        }

        return proposal;
    }

    public Proposal getMyProposal(UUID userId) {
        return proposalRepo.findByMemberId(userId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "No proposal found for your group yet"));
    }

    public Map<String, Object> getProposalHistory(UUID userId, String userRole, UUID proposalId) {
        Proposal proposal = proposalRepo.findById(proposalId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proposal not found"));

        if ("student".equals(userRole)) {
            if (!memberRepo.existsByGroupIdAndUserId(proposal.getGroupId(), userId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You can only view history for your own group's proposal");
            }
        }

        List<ProposalVersion> versions = versionRepo
            .findByProposalIdOrderByVersionNumberAsc(proposalId);

        return Map.of(
            "proposalId", proposalId,
            "totalVersions", versions.size(),
            "history", versions
        );
    }

    public List<Proposal> getSupervisorProposals(UUID supervisorId) {
        return proposalRepo.findBySupervisorId(supervisorId);
    }

    // Required at submit/resubmit time — enforced here rather than a DB
    // constraint so proposals that predate this feature don't fail schema
    // validation.
    private String storePdf(MultipartFile pdf) {
        if (pdf == null || pdf.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A PDF attachment is required");
        }
        if (!"application/pdf".equals(pdf.getContentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attachment must be a PDF file");
        }
        String filename = UUID.randomUUID() + ".pdf";
        try {
            Files.write(uploadDir.resolve(filename), pdf.getBytes());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save PDF attachment");
        }
        return filename;
    }

    public byte[] readPdf(String filename) {
        Path path = uploadDir.resolve(filename).normalize();
        if (!path.startsWith(uploadDir) || !Files.exists(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "PDF not found");
        }
        try {
            return Files.readAllBytes(path);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not read PDF");
        }
    }

    private void deleteFileQuietly(String filename) {
        try {
            Files.deleteIfExists(uploadDir.resolve(filename));
        } catch (IOException ignored) {
            // best-effort cleanup only
        }
    }

    // Helper: persist a ProposalVersion record
    private void saveVersion(UUID proposalId, int versionNumber,
                             ProposalContentRequest req, String pdfPath, String action,
                             UUID actorId, String feedback) {
        ProposalVersion v = new ProposalVersion();
        v.setProposalId(proposalId);
        v.setVersionNumber(versionNumber);
        v.setTitle(req.getTitle());
        v.setProblemStatement(req.getProblemStatement());
        v.setObjectives(req.getObjectives());
        v.setTechStack(req.getTechStack());
        v.setPdfPath(pdfPath);
        v.setAction(action);
        v.setActorId(actorId);
        v.setFeedback(feedback);
        versionRepo.save(v);
    }
}