package com.codequesthub.task.service;

import com.codequesthub.task.dto.CreateTaskRequest;
import com.codequesthub.task.dto.UpdateTaskRequest;
import com.codequesthub.task.dto.UpdateTaskStatusRequest;
import com.codequesthub.task.entity.GroupMemberView;
import com.codequesthub.task.entity.GroupView;
import com.codequesthub.task.entity.Task;
import com.codequesthub.task.entity.TaskStatus;
import com.codequesthub.task.repository.GroupMemberRepository;
import com.codequesthub.task.repository.GroupViewRepository;
import com.codequesthub.task.repository.ProposalViewRepository;
import com.codequesthub.task.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock private TaskRepository taskRepo;
    @Mock private GroupMemberRepository memberRepo;
    @Mock private GroupViewRepository groupViewRepo;
    @Mock private ProposalViewRepository proposalViewRepo;

    private TaskService service() {
        return new TaskService(taskRepo, memberRepo, groupViewRepo, proposalViewRepo);
    }

    private Task taskWith(UUID id, UUID groupId, UUID assigneeId) {
        Task t = new Task();
        ReflectionTestUtils.setField(t, "id", id);
        t.setGroupId(groupId);
        t.setAssigneeId(assigneeId);
        t.setStatus(TaskStatus.todo);
        t.setTitle("Existing task");
        return t;
    }

    private GroupView groupWith(UUID id, UUID leaderId) {
        GroupView g = new GroupView();
        ReflectionTestUtils.setField(g, "id", id);
        ReflectionTestUtils.setField(g, "groupLeaderId", leaderId);
        return g;
    }

    @Test
    void updateTask_nonMember_forbidden() {
        UUID taskId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(taskRepo.findById(taskId)).thenReturn(Optional.of(taskWith(taskId, groupId, null)));
        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(false);

        UpdateTaskRequest req = new UpdateTaskRequest();
        req.setTitle("New title");

        assertThatThrownBy(() -> service().updateTask(taskId, userId, req))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("not a member");
    }

    @Test
    void updateTask_memberButNotLeader_whenLeaderIsSet_forbidden() {
        UUID taskId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID leaderId = UUID.randomUUID();
        UUID otherMemberId = UUID.randomUUID();
        when(taskRepo.findById(taskId)).thenReturn(Optional.of(taskWith(taskId, groupId, null)));
        when(memberRepo.existsByGroupIdAndUserId(groupId, otherMemberId)).thenReturn(true);
        when(groupViewRepo.findById(groupId)).thenReturn(Optional.of(groupWith(groupId, leaderId)));

        UpdateTaskRequest req = new UpdateTaskRequest();
        req.setTitle("New title");

        assertThatThrownBy(() -> service().updateTask(taskId, otherMemberId, req))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Only the group leader");
    }

    @Test
    void updateTask_anyMember_allowed_whenNoLeaderSet() {
        UUID taskId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        when(taskRepo.findById(taskId)).thenReturn(Optional.of(taskWith(taskId, groupId, null)));
        when(memberRepo.existsByGroupIdAndUserId(groupId, memberId)).thenReturn(true);
        when(groupViewRepo.findById(groupId)).thenReturn(Optional.of(groupWith(groupId, null)));
        when(taskRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateTaskRequest req = new UpdateTaskRequest();
        req.setTitle("Updated by any member");

        Task updated = service().updateTask(taskId, memberId, req);

        assertThat(updated.getTitle()).isEqualTo("Updated by any member");
    }

    @Test
    void updateStatus_assignee_canUpdateWithoutManageRights() {
        UUID taskId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID assigneeId = UUID.randomUUID();
        // Assignee is not the leader and not even checked as a member — checkCanManage
        // is skipped entirely for the assignee, so no stub for memberRepo/groupViewRepo.
        when(taskRepo.findById(taskId)).thenReturn(Optional.of(taskWith(taskId, groupId, assigneeId)));
        when(taskRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateTaskStatusRequest req = new UpdateTaskStatusRequest();
        req.setStatus("in_progress");

        Task updated = service().updateStatus(taskId, assigneeId, req);

        assertThat(updated.getStatus()).isEqualTo(TaskStatus.in_progress);
    }

    @Test
    void updateStatus_nonAssigneeNonLeader_forbidden() {
        UUID taskId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID assigneeId = UUID.randomUUID();
        UUID leaderId = UUID.randomUUID();
        UUID otherMemberId = UUID.randomUUID();
        when(taskRepo.findById(taskId)).thenReturn(Optional.of(taskWith(taskId, groupId, assigneeId)));
        when(memberRepo.existsByGroupIdAndUserId(groupId, otherMemberId)).thenReturn(true);
        when(groupViewRepo.findById(groupId)).thenReturn(Optional.of(groupWith(groupId, leaderId)));

        UpdateTaskStatusRequest req = new UpdateTaskStatusRequest();
        req.setStatus("done");

        assertThatThrownBy(() -> service().updateStatus(taskId, otherMemberId, req))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Only the group leader");
    }

    @Test
    void updateStatus_invalidValue_badRequest() {
        UUID taskId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID assigneeId = UUID.randomUUID();
        when(taskRepo.findById(taskId)).thenReturn(Optional.of(taskWith(taskId, groupId, assigneeId)));

        UpdateTaskStatusRequest req = new UpdateTaskStatusRequest();
        req.setStatus("not_a_real_status");

        assertThatThrownBy(() -> service().updateStatus(taskId, assigneeId, req))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Invalid status");
    }

    @Test
    void createTask_assigneeNotAGroupMember_badRequest() {
        UUID userId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID assigneeId = UUID.randomUUID();
        GroupMemberView membership = new GroupMemberView();
        ReflectionTestUtils.setField(membership, "groupId", groupId);
        when(memberRepo.findByUserId(userId)).thenReturn(Optional.of(membership));
        lenient().when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(true);
        when(groupViewRepo.findById(groupId)).thenReturn(Optional.of(groupWith(groupId, null)));
        when(memberRepo.existsByGroupIdAndUserId(groupId, assigneeId)).thenReturn(false);

        CreateTaskRequest req = new CreateTaskRequest();
        req.setTitle("New task");
        req.setAssigneeId(assigneeId);

        assertThatThrownBy(() -> service().createTask(userId, req))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("not a member of your group");
    }
}
