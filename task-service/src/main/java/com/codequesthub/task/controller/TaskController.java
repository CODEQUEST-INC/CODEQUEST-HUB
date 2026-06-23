package com.codequesthub.task.controller;

import com.codequesthub.task.dto.*;
import com.codequesthub.task.entity.Task;
import com.codequesthub.task.service.TaskService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "service", "task-service"));
    }

    // student — create a task in their own group (leader, or any member if no leader set)
    @PostMapping
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<?> create(@Valid @RequestBody CreateTaskRequest req, Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        Task t = taskService.createTask(userId, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", t));
    }

    // group members, the group's supervisor, or admin
    @GetMapping("/group/{groupId}")
    public ResponseEntity<?> listForGroup(@PathVariable UUID groupId, Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        List<Task> tasks = taskService.getTasksForGroup(groupId, userId, roleOf(auth));
        return ResponseEntity.ok(Map.of("data", tasks));
    }

    // group members, the group's supervisor, or admin
    @GetMapping("/{taskId}")
    public ResponseEntity<?> getOne(@PathVariable UUID taskId, Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        Task t = taskService.getTask(taskId, userId, roleOf(auth));
        return ResponseEntity.ok(Map.of("data", t));
    }

    // student — leader, or any member if no leader set
    @PatchMapping("/{taskId}")
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<?> update(@PathVariable UUID taskId,
                                    @Valid @RequestBody UpdateTaskRequest req,
                                    Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        Task t = taskService.updateTask(taskId, userId, req);
        return ResponseEntity.ok(Map.of("data", t));
    }

    // student — leader, or any member if no leader set
    @PatchMapping("/{taskId}/assign")
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<?> assign(@PathVariable UUID taskId,
                                    @Valid @RequestBody AssignTaskRequest req,
                                    Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        Task t = taskService.assignTask(taskId, userId, req);
        return ResponseEntity.ok(Map.of("data", t));
    }

    // student — the task's assignee, the leader, or any member if no leader set
    @PatchMapping("/{taskId}/status")
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<?> updateStatus(@PathVariable UUID taskId,
                                          @Valid @RequestBody UpdateTaskStatusRequest req,
                                          Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        Task t = taskService.updateStatus(taskId, userId, req);
        return ResponseEntity.ok(Map.of("data", t));
    }

    // student — leader, or any member if no leader set
    @DeleteMapping("/{taskId}")
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<?> delete(@PathVariable UUID taskId, Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        taskService.deleteTask(taskId, userId);
        return ResponseEntity.noContent().build();
    }

    private String roleOf(Authentication auth) {
        Claims claims = (Claims) auth.getDetails();
        return claims.get("role", String.class);
    }
}
