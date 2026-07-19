package com.codequesthub.project.service;

import com.codequesthub.project.dto.ProposalContentRequest;
import com.codequesthub.project.dto.ReviewRequest;
import com.codequesthub.project.entity.GroupMemberView;
import com.codequesthub.project.entity.GroupView;
import com.codequesthub.project.entity.Proposal;
import com.codequesthub.project.entity.ProposalStatus;
import com.codequesthub.project.repository.GroupMemberRepository;
import com.codequesthub.project.repository.GroupViewRepository;
import com.codequesthub.project.repository.ProposalRepository;
import com.codequesthub.project.repository.ProposalVersionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProposalServiceTest {

    @Mock private ProposalRepository proposalRepo;
    @Mock private ProposalVersionRepository versionRepo;
    @Mock private GroupMemberRepository memberRepo;
    @Mock private GroupViewRepository groupViewRepo;

    @TempDir
    Path uploadDir;

    // Method, not a field initializer — MockitoExtension injects @Mock fields
    // after field initializers would already have run.
    private ProposalService service() {
        return new ProposalService(proposalRepo, versionRepo, memberRepo, groupViewRepo, uploadDir.toString());
    }

    private GroupMemberView membershipOf(UUID groupId) {
        GroupMemberView m = new GroupMemberView();
        ReflectionTestUtils.setField(m, "groupId", groupId);
        return m;
    }

    private Proposal proposalWith(UUID id, UUID groupId, ProposalStatus status) {
        Proposal p = new Proposal();
        ReflectionTestUtils.setField(p, "id", id);
        p.setGroupId(groupId);
        p.setStatus(status);
        p.setCurrentVersion(1);
        p.setTitle("Existing title");
        p.setProblemStatement("Existing problem statement long enough to pass validation.");
        p.setObjectives("Existing objectives");
        p.setTechStack("Existing stack");
        return p;
    }

    private ProposalContentRequest contentReq() {
        ProposalContentRequest req = new ProposalContentRequest();
        req.setTitle("A new project title");
        req.setProblemStatement("A problem statement that is definitely long enough.");
        req.setObjectives("Objectives long enough");
        req.setTechStack("React Native");
        return req;
    }

    private MultipartFile validPdf() {
        return new MockMultipartFile("file", "proposal.pdf", "application/pdf", new byte[] { 1, 2, 3 });
    }

    @Test
    void submitProposal_groupAlreadyHasProposal_conflict() {
        UUID userId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        when(memberRepo.findByUserId(userId)).thenReturn(Optional.of(membershipOf(groupId)));
        when(proposalRepo.findByGroupId(groupId))
            .thenReturn(Optional.of(proposalWith(UUID.randomUUID(), groupId, ProposalStatus.submitted)));

        assertThatThrownBy(() -> service().submitProposal(userId, contentReq(), validPdf()))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("already has a proposal");
    }

    @Test
    void submitProposal_noExistingProposal_succeeds() {
        UUID userId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        when(memberRepo.findByUserId(userId)).thenReturn(Optional.of(membershipOf(groupId)));
        when(proposalRepo.findByGroupId(groupId)).thenReturn(Optional.empty());
        when(proposalRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Proposal created = service().submitProposal(userId, contentReq(), validPdf());

        assertThat(created.getGroupId()).isEqualTo(groupId);
        assertThat(created.getStatus()).isEqualTo(ProposalStatus.submitted);
        assertThat(created.getCurrentVersion()).isEqualTo(1);
        assertThat(created.getPdfUrl()).startsWith("/api/proposals/pdfs/").endsWith(".pdf");
    }

    @Test
    void submitProposal_missingPdf_badRequest() {
        UUID userId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        when(memberRepo.findByUserId(userId)).thenReturn(Optional.of(membershipOf(groupId)));
        when(proposalRepo.findByGroupId(groupId)).thenReturn(Optional.empty());

        MultipartFile empty = new MockMultipartFile("file", "proposal.pdf", "application/pdf", new byte[0]);

        assertThatThrownBy(() -> service().submitProposal(userId, contentReq(), empty))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("PDF attachment is required");
    }

    @Test
    void submitProposal_nonPdfContentType_badRequest() {
        UUID userId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        when(memberRepo.findByUserId(userId)).thenReturn(Optional.of(membershipOf(groupId)));
        when(proposalRepo.findByGroupId(groupId)).thenReturn(Optional.empty());

        MultipartFile notPdf = new MockMultipartFile("file", "proposal.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", new byte[] { 1 });

        assertThatThrownBy(() -> service().submitProposal(userId, contentReq(), notPdf))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("must be a PDF");
    }

    @Test
    void resubmitProposal_wrongStatus_badRequest() {
        UUID userId = UUID.randomUUID();
        UUID proposalId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        Proposal proposal = proposalWith(proposalId, groupId, ProposalStatus.submitted);
        when(proposalRepo.findById(proposalId)).thenReturn(Optional.of(proposal));
        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(true);

        assertThatThrownBy(() -> service().resubmitProposal(userId, proposalId, contentReq(), validPdf()))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Cannot resubmit");
    }

    @Test
    void resubmitProposal_fromRejected_succeedsAndBumpsVersion() {
        UUID userId = UUID.randomUUID();
        UUID proposalId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        Proposal proposal = proposalWith(proposalId, groupId, ProposalStatus.rejected);
        when(proposalRepo.findById(proposalId)).thenReturn(Optional.of(proposal));
        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(true);
        when(proposalRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Proposal updated = service().resubmitProposal(userId, proposalId, contentReq(), validPdf());

        assertThat(updated.getStatus()).isEqualTo(ProposalStatus.submitted);
        assertThat(updated.getCurrentVersion()).isEqualTo(2);
        assertThat(updated.getPdfUrl()).isNotNull();
    }

    @Test
    void resubmitProposal_notAGroupMember_forbidden() {
        UUID userId = UUID.randomUUID();
        UUID proposalId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        Proposal proposal = proposalWith(proposalId, groupId, ProposalStatus.rejected);
        when(proposalRepo.findById(proposalId)).thenReturn(Optional.of(proposal));
        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(false);

        assertThatThrownBy(() -> service().resubmitProposal(userId, proposalId, contentReq(), validPdf()))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("not a member");
    }

    @Test
    void reviewProposal_wrongSupervisor_forbidden() {
        UUID actingSupervisor = UUID.randomUUID();
        UUID assignedSupervisor = UUID.randomUUID();
        UUID proposalId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        Proposal proposal = proposalWith(proposalId, groupId, ProposalStatus.submitted);
        when(proposalRepo.findById(proposalId)).thenReturn(Optional.of(proposal));
        GroupView group = new GroupView();
        ReflectionTestUtils.setField(group, "id", groupId);
        ReflectionTestUtils.setField(group, "supervisorId", assignedSupervisor);
        when(groupViewRepo.findById(groupId)).thenReturn(Optional.of(group));

        ReviewRequest req = new ReviewRequest();
        req.setAction("approved");

        assertThatThrownBy(() -> service().reviewProposal(actingSupervisor, proposalId, req))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("not the assigned supervisor");
    }

    @Test
    void reviewProposal_alreadyApproved_badRequest() {
        UUID supervisorId = UUID.randomUUID();
        UUID proposalId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        Proposal proposal = proposalWith(proposalId, groupId, ProposalStatus.approved);
        when(proposalRepo.findById(proposalId)).thenReturn(Optional.of(proposal));
        GroupView group = new GroupView();
        ReflectionTestUtils.setField(group, "id", groupId);
        ReflectionTestUtils.setField(group, "supervisorId", supervisorId);
        when(groupViewRepo.findById(groupId)).thenReturn(Optional.of(group));

        ReviewRequest req = new ReviewRequest();
        req.setAction("approved");

        assertThatThrownBy(() -> service().reviewProposal(supervisorId, proposalId, req))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Cannot review");
    }

    @Test
    void reviewProposal_rejectWithoutFeedback_badRequestBeforeTouchingRepositories() {
        UUID supervisorId = UUID.randomUUID();
        UUID proposalId = UUID.randomUUID();
        ReviewRequest req = new ReviewRequest();
        req.setAction("rejected");
        req.setFeedback(null);

        assertThatThrownBy(() -> service().reviewProposal(supervisorId, proposalId, req))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("feedback is required");
    }
}
