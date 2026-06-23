package com.codequesthub.project.service;

import com.codequesthub.project.dto.*;
import com.codequesthub.project.entity.*;
import com.codequesthub.project.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class ProposalService {

    private final ProposalRepository proposalRepo;
    private final ProposalVersionRepository versionRepo;
    private final GroupMemberRepository memberRepo;
    private final GroupViewRepository groupViewRepo;

    public ProposalService(ProposalRepository proposalRepo,
                           ProposalVersionRepository versionRepo,
                           GroupMemberRepository memberRepo,
                           GroupViewRepository groupViewRepo) {
        this.proposalRepo = proposalRepo;
        this.versionRepo = versionRepo;
        this.memberRepo = memberRepo;
        this.groupViewRepo = groupViewRepo;
    }

    @Transactional
    public Proposal submitProposal(UUID userId, ProposalContentRequest req) {
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

        Proposal p = new Proposal();
        p.setGroupId(groupId);
        p.setTitle(req.getTitle());
        p.setProblemStatement(req.getProblemStatement());
        p.setObjectives(req.getObjectives());
        p.setTechStack(req.getTechStack());
        p.setStatus(ProposalStatus.submitted);
        p.setCurrentVersion(1);
        p.setSubmittedBy(userId);
        p = proposalRepo.save(p);

        saveVersion(p.getId(), 1, req, "submitted", userId, null);
        return p;
    }

    @Transactional
    public Proposal resubmitProposal(UUID userId, UUID proposalId, ProposalContentRequest req) {
        Proposal proposal = proposalRepo.findById(proposalId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proposal not found"));

        if (!memberRepo.existsByGroupIdAndUserId(proposal.getGroupId(), userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You are not a member of this proposal's group");
        }

        if (proposal.getStatus() != ProposalStatus.changes_requested &&
            proposal.getStatus() != ProposalStatus.rejected) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Cannot resubmit a proposal with status \"" + proposal.getStatus().name() +
                "\". Resubmission is only allowed after rejection or a request for changes.");
        }

        int newVersion = proposal.getCurrentVersion() + 1;
        proposal.setTitle(req.getTitle());
        proposal.setProblemStatement(req.getProblemStatement());
        proposal.setObjectives(req.getObjectives());
        proposal.setTechStack(req.getTechStack());
        proposal.setStatus(ProposalStatus.submitted);
        proposal.setCurrentVersion(newVersion);
        proposal.setSubmittedBy(userId);
        proposal = proposalRepo.save(proposal);

        saveVersion(proposal.getId(), newVersion, req, "submitted", userId, null);
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

        // Snapshot current content for the version record
        ProposalContentRequest snapshot = new ProposalContentRequest();
        snapshot.setTitle(proposal.getTitle());
        snapshot.setProblemStatement(proposal.getProblemStatement());
        snapshot.setObjectives(proposal.getObjectives());
        snapshot.setTechStack(proposal.getTechStack());
        saveVersion(proposal.getId(), newVersion, snapshot, req.getAction(), supervisorId, req.getFeedback());
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

    // Helper: persist a ProposalVersion record
    private void saveVersion(UUID proposalId, int versionNumber,
                             ProposalContentRequest req, String action,
                             UUID actorId, String feedback) {
        ProposalVersion v = new ProposalVersion();
        v.setProposalId(proposalId);
        v.setVersionNumber(versionNumber);
        v.setTitle(req.getTitle());
        v.setProblemStatement(req.getProblemStatement());
        v.setObjectives(req.getObjectives());
        v.setTechStack(req.getTechStack());
        v.setAction(action);
        v.setActorId(actorId);
        v.setFeedback(feedback);
        versionRepo.save(v);
    }
}
