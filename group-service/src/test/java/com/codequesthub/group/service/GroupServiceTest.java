package com.codequesthub.group.service;

import com.codequesthub.group.dto.AutoGroupRequest;
import com.codequesthub.group.dto.CreateGroupRequest;
import com.codequesthub.group.dto.SetGroupLeaderRequest;
import com.codequesthub.group.entity.Group;
import com.codequesthub.group.entity.UserRole;
import com.codequesthub.group.entity.UserView;
import com.codequesthub.group.repository.CohortRepository;
import com.codequesthub.group.repository.GroupMemberRepository;
import com.codequesthub.group.repository.GroupRepository;
import com.codequesthub.group.repository.UserViewRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Path;
import java.util.List;
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
    @Mock private CohortRepository cohortRepo;
    @Mock private UserViewRepository userViewRepo;

    @TempDir
    Path uploadDir;

    // A method, not a field initializer — field initializers run before
    // MockitoExtension injects @Mock fields, so groupRepo/memberRepo would
    // still be null at that point.
    private GroupService groupService() {
        return new GroupService(groupRepo, memberRepo, cohortRepo, userViewRepo, uploadDir.toString());
    }

    private UserView studentWith(String indexNumber) {
        UserView u = new UserView();
        ReflectionTestUtils.setField(u, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(u, "indexNumber", indexNumber);
        ReflectionTestUtils.setField(u, "role", UserRole.student);
        return u;
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
    void autoGroup_cohortNotFound_notFound() {
        UUID cohortId = UUID.randomUUID();
        when(cohortRepo.existsById(cohortId)).thenReturn(false);

        AutoGroupRequest req = new AutoGroupRequest();
        req.setGroupSize(5);

        assertThatThrownBy(() -> groupService().autoGroup(cohortId, req))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Cohort not found");
    }

    @Test
    void autoGroup_noStudentsInCohort_badRequest() {
        UUID cohortId = UUID.randomUUID();
        when(cohortRepo.existsById(cohortId)).thenReturn(true);
        when(userViewRepo.findByCohortIdAndRole(cohortId, UserRole.student)).thenReturn(List.of());

        AutoGroupRequest req = new AutoGroupRequest();
        req.setGroupSize(5);

        assertThatThrownBy(() -> groupService().autoGroup(cohortId, req))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("No students are registered");
    }

    @Test
    void autoGroup_chunksStudentsByIndexNumberOrder_andDissolvesExistingGroups() {
        UUID cohortId = UUID.randomUUID();
        when(cohortRepo.existsById(cohortId)).thenReturn(true);

        // Deliberately out of order and including a non-numeric index number —
        // the sort must still put them in ascending numeric order, with the
        // unparsable one pushed to the very end.
        UserView s5 = studentWith("5");
        UserView s1 = studentWith("1");
        UserView s3 = studentWith("3");
        UserView s2 = studentWith("2");
        UserView sBad = studentWith("not-a-number");
        when(userViewRepo.findByCohortIdAndRole(cohortId, UserRole.student))
            .thenReturn(List.of(s5, s1, s3, s2, sBad));

        Group existingGroup = new Group();
        ReflectionTestUtils.setField(existingGroup, "id", UUID.randomUUID());
        when(groupRepo.findByCohortId(cohortId)).thenReturn(List.of(existingGroup));
        when(groupRepo.save(any())).thenAnswer(inv -> {
            Group g = inv.getArgument(0);
            ReflectionTestUtils.setField(g, "id", UUID.randomUUID());
            return g;
        });
        when(memberRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AutoGroupRequest req = new AutoGroupRequest();
        req.setGroupSize(2);

        Map<String, Object> result = groupService().autoGroup(cohortId, req);

        assertThat(result.get("studentsGrouped")).isEqualTo(5);
        // 5 students in groups of 2 -> groups of [2, 2, 1]
        assertThat(result.get("groupsCreated")).isEqualTo(3);
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
