package com.codequesthub.task.service;

import com.codequesthub.task.dto.*;
import com.codequesthub.task.entity.*;
import com.codequesthub.task.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class TaskService {

    private final TaskRepository taskRepo;
    private final GroupMemberRepository memberRepo;
    private final GroupViewRepository groupViewRepo;
    private final ProposalViewRepository proposalViewRepo;

    public TaskService(TaskRepository taskRepo,
                       GroupMemberRepository memberRepo,
                       GroupViewRepository groupViewRepo,
                       ProposalViewRepository proposalViewRepo) {
        this.taskRepo = taskRepo;
        this.memberRepo = memberRepo;
        this.groupViewRepo = groupViewRepo;
        this.proposalViewRepo = proposalViewRepo;
    }

    @Transactional
    public Task createTask(UUID userId, CreateTaskRequest req) {
        GroupMemberView membership = memberRepo.findByUserId(userId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "You are not assigned to a group"));

        UUID groupId = membership.getGroupId();
        checkCanManage(groupId, userId);

        if (req.getAssigneeId() != null && !memberRepo.existsByGroupIdAndUserId(groupId, req.getAssigneeId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Assignee is not a member of your group");
        }

        Task t = new Task();
        t.setGroupId(groupId);
        proposalViewRepo.findByGroupId(groupId).ifPresent(p -> t.setProposalId(p.getId()));
        t.setTitle(req.getTitle());
        t.setDescription(req.getDescription());
        t.setAssigneeId(req.getAssigneeId());
        t.setDueDate(req.getDueDate());
        t.setCreatedBy(userId);
        t.setStatus(TaskStatus.todo);
        return taskRepo.save(t);
    }

    public List<Task> getTasksForGroup(UUID groupId, UUID userId, String role) {
        checkCanView(groupId, userId, role);
        return taskRepo.findByGroupIdOrderByCreatedAtDesc(groupId);
    }

    public Task getTask(UUID taskId, UUID userId, String role) {
        Task t = findTaskOr404(taskId);
        checkCanView(t.getGroupId(), userId, role);
        return t;
    }

    @Transactional
    public Task updateTask(UUID taskId, UUID userId, UpdateTaskRequest req) {
        Task t = findTaskOr404(taskId);
        checkCanManage(t.getGroupId(), userId);
        t.setTitle(req.getTitle());
        t.setDescription(req.getDescription());
        t.setDueDate(req.getDueDate());
        return taskRepo.save(t);
    }

    @Transactional
    public Task assignTask(UUID taskId, UUID userId, AssignTaskRequest req) {
        Task t = findTaskOr404(taskId);
        checkCanManage(t.getGroupId(), userId);
        if (!memberRepo.existsByGroupIdAndUserId(t.getGroupId(), req.getUserId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Assignee is not a member of this task's group");
        }
        t.setAssigneeId(req.getUserId());
        return taskRepo.save(t);
    }

    @Transactional
    public Task updateStatus(UUID taskId, UUID userId, UpdateTaskStatusRequest req) {
        Task t = findTaskOr404(taskId);

        TaskStatus newStatus;
        try {
            newStatus = TaskStatus.valueOf(req.getStatus());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Invalid status. Must be one of: todo, in_progress, done");
        }

        boolean isAssignee = t.getAssigneeId() != null && t.getAssigneeId().equals(userId);
        if (!isAssignee) {
            checkCanManage(t.getGroupId(), userId);
        }

        t.setStatus(newStatus);
        return taskRepo.save(t);
    }

    @Transactional
    public void deleteTask(UUID taskId, UUID userId) {
        Task t = findTaskOr404(taskId);
        checkCanManage(t.getGroupId(), userId);
        taskRepo.delete(t);
    }

    private Task findTaskOr404(UUID taskId) {
        return taskRepo.findById(taskId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
    }

    // Only the group leader can manage tasks; if no leader is set, any member may.
    private void checkCanManage(UUID groupId, UUID userId) {
        if (!memberRepo.existsByGroupIdAndUserId(groupId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this group");
        }
        GroupView group = groupViewRepo.findById(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));

        UUID leaderId = group.getGroupLeaderId();
        if (leaderId != null && !leaderId.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Only the group leader can manage tasks for this group");
        }
    }

    private void checkCanView(UUID groupId, UUID userId, String role) {
        if ("admin".equals(role)) return;

        if ("supervisor".equals(role)) {
            GroupView group = groupViewRepo.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
            if (!userId.equals(group.getSupervisorId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You are not the assigned supervisor for this group");
            }
            return;
        }

        if (!memberRepo.existsByGroupIdAndUserId(groupId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this group");
        }
    }
}
