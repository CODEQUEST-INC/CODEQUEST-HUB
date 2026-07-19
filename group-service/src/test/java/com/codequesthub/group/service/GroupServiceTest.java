package com.codequesthub.group.service;

import com.codequesthub.group.dto.CreateGroupRequest;
import com.codequesthub.group.dto.SetGroupLeaderRequest;
import com.codequesthub.group.entity.Group;
import com.codequesthub.group.repository.GroupMemberRepository;
import com.codequesthub.group.repository.GroupRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GroupServiceTest {

    @Mock private GroupRepository groupRepo;
    @Mock private GroupMemberRepository memberRepo;

    @TempDir
    Path uploadDir;

    // A method, not a field initializer — field initializers run before
    // MockitoExtension injects @Mock fields, so groupRepo/memberRepo would
    // still be null at that point.
    private GroupService groupService() {
        return new GroupService(groupRepo, memberRepo, uploadDir.toString());
    }

    private Group groupWith(UUID id, UUID supervisorId) {
        Group g = new Group();
        ReflectionTestUtils.setField(g, "id", id);
        g.setCohortId(UUID.randomUUID());
        g.setGroupNumber(129);
        g.setSupervisorId(supervisorId);
        return g;
    }

    @Test
    void setGroupLeader_supervisorNotAssignedToGroup_forbidden() {
        UUID groupId = UUID.randomUUID();
        UUID assignedSupervisor = UUID.randomUUID();
        UUID actingSupervisor = UUID.randomUUID(); // different from assignedSupervisor
        Group group = groupWith(groupId, assignedSupervisor);
        when(groupRepo.findById(groupId)).thenReturn(java.util.Optional.of(group));

        SetGroupLeaderRequest req = new SetGroupLeaderRequest();
        req.setUserId(UUID.randomUUID());

        assertThatThrownBy(() -> groupService().setGroupLeader(groupId, actingSupervisor, "supervisor", req))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("not the assigned supervisor");
    }

    @Test
    void setGroupLeader_userNotAMember_badRequest() {
        UUID groupId = UUID.randomUUID();
        UUID supervisorId = UUID.randomUUID();
        Group group = groupWith(groupId, supervisorId);
        when(groupRepo.findById(groupId)).thenReturn(java.util.Optional.of(group));
        when(memberRepo.existsByGroupIdAndUserId(eq(groupId), any())).thenReturn(false);

        SetGroupLeaderRequest req = new SetGroupLeaderRequest();
        req.setUserId(UUID.randomUUID());

        assertThatThrownBy(() -> groupService().setGroupLeader(groupId, supervisorId, "supervisor", req))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("not a member");
    }

    @Test
    void setGroupLeader_validMember_setsLeader() {
        UUID groupId = UUID.randomUUID();
        UUID supervisorId = UUID.randomUUID();
        UUID newLeaderId = UUID.randomUUID();
        Group group = groupWith(groupId, supervisorId);
        when(groupRepo.findById(groupId)).thenReturn(java.util.Optional.of(group));
        when(memberRepo.existsByGroupIdAndUserId(groupId, newLeaderId)).thenReturn(true);
        when(groupRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SetGroupLeaderRequest req = new SetGroupLeaderRequest();
        req.setUserId(newLeaderId);

        Group updated = groupService().setGroupLeader(groupId, supervisorId, "supervisor", req);

        assertThat(updated.getGroupLeaderId()).isEqualTo(newLeaderId);
    }

    @Test
    void setGroupLeader_adminActingRole_bypassesSupervisorCheck() {
        UUID groupId = UUID.randomUUID();
        UUID otherSupervisorId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        UUID newLeaderId = UUID.randomUUID();
        Group group = groupWith(groupId, otherSupervisorId);
        when(groupRepo.findById(groupId)).thenReturn(java.util.Optional.of(group));
        when(memberRepo.existsByGroupIdAndUserId(groupId, newLeaderId)).thenReturn(true);
        when(groupRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SetGroupLeaderRequest req = new SetGroupLeaderRequest();
        req.setUserId(newLeaderId);

        Group updated = groupService().setGroupLeader(groupId, adminId, "admin", req);

        assertThat(updated.getGroupLeaderId()).isEqualTo(newLeaderId);
    }

    @Test
    void createGroup_duplicateGroupNumberInCohort_conflict() {
        UUID cohortId = UUID.randomUUID();
        CreateGroupRequest req = new CreateGroupRequest();
        req.setCohortId(cohortId);
        req.setGroupNumber(129);
        when(groupRepo.existsByCohortIdAndGroupNumber(cohortId, 129)).thenReturn(true);

        assertThatThrownBy(() -> groupService().createGroup(req))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("already exists");
    }

    @Test
    void createGroup_newGroupNumber_succeeds() {
        UUID cohortId = UUID.randomUUID();
        CreateGroupRequest req = new CreateGroupRequest();
        req.setCohortId(cohortId);
        req.setGroupNumber(130);
        req.setName("Group 130");
        when(groupRepo.existsByCohortIdAndGroupNumber(cohortId, 130)).thenReturn(false);
        when(groupRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Group created = groupService().createGroup(req);

        assertThat(created.getCohortId()).isEqualTo(cohortId);
        assertThat(created.getGroupNumber()).isEqualTo(130);
        assertThat(created.getName()).isEqualTo("Group 130");
    }

    @Test
    void uploadPhoto_nonMember_forbidden() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(groupRepo.findById(groupId)).thenReturn(java.util.Optional.of(groupWith(groupId, UUID.randomUUID())));
        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(false);

        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", new byte[] { 1, 2, 3 });

        assertThatThrownBy(() -> groupService().uploadPhoto(groupId, userId, file))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("not a member");
    }

    @Test
    void uploadPhoto_unsupportedContentType_badRequest() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(groupRepo.findById(groupId)).thenReturn(java.util.Optional.of(groupWith(groupId, UUID.randomUUID())));
        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(true);

        MockMultipartFile file = new MockMultipartFile("file", "doc.pdf", "application/pdf", new byte[] { 1, 2, 3 });

        assertThatThrownBy(() -> groupService().uploadPhoto(groupId, userId, file))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Unsupported image type");
    }

    @Test
    void uploadPhoto_validMemberAndImage_savesAndReturnsPhotoUrl() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(groupRepo.findById(groupId)).thenReturn(java.util.Optional.of(groupWith(groupId, UUID.randomUUID())));
        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(true);
        when(memberRepo.findByGroupId(groupId)).thenReturn(java.util.List.of());
        when(groupRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", new byte[] { 1, 2, 3 });

        Map<String, Object> result = groupService().uploadPhoto(groupId, userId, file);

        assertThat((String) result.get("photoUrl")).startsWith("/api/groups/photos/").endsWith(".png");
    }
}
