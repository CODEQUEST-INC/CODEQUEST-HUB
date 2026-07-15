package com.codequesthub.showcase.service;

import com.codequesthub.showcase.dto.UpsertShowcaseRequest;
import com.codequesthub.showcase.entity.GroupView;
import com.codequesthub.showcase.entity.ProposalStatus;
import com.codequesthub.showcase.entity.ProposalView;
import com.codequesthub.showcase.entity.ShowcaseEntry;
import com.codequesthub.showcase.repository.GroupMemberRepository;
import com.codequesthub.showcase.repository.GroupViewRepository;
import com.codequesthub.showcase.repository.ProposalViewRepository;
import com.codequesthub.showcase.repository.ShowcaseEntryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShowcaseServiceTest {

    @Mock private ShowcaseEntryRepository entryRepo;
    @Mock private GroupViewRepository groupViewRepo;
    @Mock private GroupMemberRepository memberRepo;
    @Mock private ProposalViewRepository proposalViewRepo;

    @TempDir
    Path uploadDir;

    private ShowcaseService service() {
        return new ShowcaseService(entryRepo, groupViewRepo, memberRepo, proposalViewRepo, uploadDir.toString());
    }

    private ProposalView proposalWith(UUID groupId, ProposalStatus status) {
        ProposalView p = new ProposalView();
        ReflectionTestUtils.setField(p, "groupId", groupId);
        ReflectionTestUtils.setField(p, "status", status);
        return p;
    }

    private UpsertShowcaseRequest upsertReq() {
        UpsertShowcaseRequest req = new UpsertShowcaseRequest();
        req.setTitle("My project");
        req.setDescription("A description");
        req.setGithubUrl("https://github.com/example/repo");
        return req;
    }

    @Test
    void upsertEntry_notAMember_forbidden() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(false);

        assertThatThrownBy(() -> service().upsertEntry(groupId, userId, upsertReq()))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("not a member");
    }

    @Test
    void upsertEntry_noProposalYet_badRequest() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(true);
        GroupView group = new GroupView();
        ReflectionTestUtils.setField(group, "id", groupId);
        when(groupViewRepo.findById(groupId)).thenReturn(Optional.of(group));
        when(proposalViewRepo.findByGroupId(groupId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().upsertEntry(groupId, userId, upsertReq()))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("no proposal yet");
    }

    @Test
    void upsertEntry_proposalNotApproved_badRequest() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(true);
        GroupView group = new GroupView();
        ReflectionTestUtils.setField(group, "id", groupId);
        when(groupViewRepo.findById(groupId)).thenReturn(Optional.of(group));
        when(proposalViewRepo.findByGroupId(groupId))
            .thenReturn(Optional.of(proposalWith(groupId, ProposalStatus.under_review)));

        assertThatThrownBy(() -> service().upsertEntry(groupId, userId, upsertReq()))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("must be approved");
    }

    @Test
    void deleteEntry_nonMemberNonAdmin_forbidden() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(false);

        assertThatThrownBy(() -> service().deleteEntry(groupId, userId, "student"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("not a member");
    }

    @Test
    void deleteEntry_groupMember_allowed() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(true);
        ShowcaseEntry entry = new ShowcaseEntry();
        entry.setGroupId(groupId);
        when(entryRepo.findByGroupId(groupId)).thenReturn(Optional.of(entry));

        service().deleteEntry(groupId, userId, "student");
        // No exception thrown = success; entryRepo.delete was called with the found entry.
    }

    @Test
    void deleteEntry_adminOnAnyGroup_allowedWithoutMembershipCheck() {
        UUID groupId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        // No stub for memberRepo.existsByGroupIdAndUserId — proves the admin
        // path never even calls it.
        ShowcaseEntry entry = new ShowcaseEntry();
        entry.setGroupId(groupId);
        when(entryRepo.findByGroupId(groupId)).thenReturn(Optional.of(entry));

        service().deleteEntry(groupId, adminId, "admin");
    }
}
