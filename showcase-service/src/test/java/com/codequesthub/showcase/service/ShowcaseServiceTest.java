package com.codequesthub.showcase.service;

import com.codequesthub.showcase.dto.UpsertShowcaseRequest;
import com.codequesthub.showcase.entity.GroupView;
import com.codequesthub.showcase.entity.ProposalStatus;
import com.codequesthub.showcase.entity.ProposalView;
import com.codequesthub.showcase.entity.ShowcaseEntry;
import com.codequesthub.showcase.entity.ShowcasePhoto;
import com.codequesthub.showcase.repository.GroupMemberRepository;
import com.codequesthub.showcase.repository.GroupViewRepository;
import com.codequesthub.showcase.repository.ProposalViewRepository;
import com.codequesthub.showcase.repository.ShowcaseEntryRepository;
import com.codequesthub.showcase.repository.ShowcasePhotoRepository;
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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShowcaseServiceTest {

    @Mock private ShowcaseEntryRepository entryRepo;
    @Mock private ShowcasePhotoRepository photoRepo;
    @Mock private GroupViewRepository groupViewRepo;
    @Mock private GroupMemberRepository memberRepo;
    @Mock private ProposalViewRepository proposalViewRepo;

    @TempDir
    Path uploadDir;

    private ShowcaseService service() {
        return new ShowcaseService(entryRepo, photoRepo, groupViewRepo, memberRepo, proposalViewRepo, uploadDir.toString());
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

    private GroupView approvedGroupSetup(UUID groupId, UUID userId) {
        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(true);
        GroupView group = new GroupView();
        ReflectionTestUtils.setField(group, "id", groupId);
        when(groupViewRepo.findById(groupId)).thenReturn(Optional.of(group));
        when(proposalViewRepo.findByGroupId(groupId))
            .thenReturn(Optional.of(proposalWith(groupId, ProposalStatus.approved)));
        return group;
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

    @Test
    void addPhoto_atCap_badRequest() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        approvedGroupSetup(groupId, userId);
        UUID entryId = UUID.randomUUID();
        ShowcaseEntry entry = new ShowcaseEntry();
        ReflectionTestUtils.setField(entry, "id", entryId);
        entry.setGroupId(groupId);
        when(entryRepo.findByGroupId(groupId)).thenReturn(Optional.of(entry));
        when(photoRepo.countByEntryId(entryId)).thenReturn(5L);

        MultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", new byte[] { 1, 2, 3 });

        assertThatThrownBy(() -> service().addPhoto(groupId, userId, file))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Maximum 5 photos");
    }

    @Test
    void addPhoto_underCapWithValidImage_succeeds() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        approvedGroupSetup(groupId, userId);
        UUID entryId = UUID.randomUUID();
        ShowcaseEntry entry = new ShowcaseEntry();
        ReflectionTestUtils.setField(entry, "id", entryId);
        entry.setGroupId(groupId);
        when(entryRepo.findByGroupId(groupId)).thenReturn(Optional.of(entry));
        when(photoRepo.countByEntryId(entryId)).thenReturn(2L);
        when(photoRepo.findByEntryIdOrderByPositionAsc(entryId)).thenReturn(List.of(new ShowcasePhoto()));

        MultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", new byte[] { 1, 2, 3 });

        var result = service().addPhoto(groupId, userId, file);

        assertThat(result.getPhotos()).hasSize(1);
    }

    @Test
    void addPhoto_unsupportedContentType_badRequest() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        approvedGroupSetup(groupId, userId);
        UUID entryId = UUID.randomUUID();
        ShowcaseEntry entry = new ShowcaseEntry();
        ReflectionTestUtils.setField(entry, "id", entryId);
        entry.setGroupId(groupId);
        when(entryRepo.findByGroupId(groupId)).thenReturn(Optional.of(entry));
        when(photoRepo.countByEntryId(entryId)).thenReturn(0L);

        MultipartFile file = new MockMultipartFile("file", "doc.pdf", "application/pdf", new byte[] { 1 });

        assertThatThrownBy(() -> service().addPhoto(groupId, userId, file))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Unsupported image type");
    }

    @Test
    void deletePhoto_photoBelongsToDifferentEntry_notFound() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        approvedGroupSetup(groupId, userId);
        UUID entryId = UUID.randomUUID();
        ShowcaseEntry entry = new ShowcaseEntry();
        ReflectionTestUtils.setField(entry, "id", entryId);
        entry.setGroupId(groupId);
        when(entryRepo.findByGroupId(groupId)).thenReturn(Optional.of(entry));

        UUID photoId = UUID.randomUUID();
        ShowcasePhoto photo = new ShowcasePhoto();
        ReflectionTestUtils.setField(photo, "id", photoId);
        photo.setEntryId(UUID.randomUUID()); // different entry
        when(photoRepo.findById(photoId)).thenReturn(Optional.of(photo));

        assertThatThrownBy(() -> service().deletePhoto(groupId, userId, photoId))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("not found");
    }
}
