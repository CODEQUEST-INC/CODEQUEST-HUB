package com.codequesthub.group.controller;

import com.codequesthub.group.dto.*;
import com.codequesthub.group.entity.Group;
import com.codequesthub.group.service.GroupService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    private final GroupService groupService;

    public GroupController(GroupService groupService) { this.groupService = groupService; }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "service", "group-service"));
    }

    // admin only
    @PostMapping
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<?> createGroup(@Valid @RequestBody CreateGroupRequest req) {
        Group g = groupService.createGroup(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", g));
    }

    // admin only
    @PostMapping("/{groupId}/members")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<?> assignMembers(@PathVariable UUID groupId,
                                           @Valid @RequestBody AssignMembersRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("data", groupService.assignMembers(groupId, req)));
    }

    // any authenticated user — list groups in a cohort (e.g. for a judge picking a group to score)
    @GetMapping
    public ResponseEntity<?> listByCohort(@RequestParam UUID cohortId) {
        return ResponseEntity.ok(Map.of("data", groupService.listByCohort(cohortId)));
    }

    // student — their own group
    @GetMapping("/me")
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<?> getMyGroup(Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        return ResponseEntity.ok(Map.of("data", groupService.getMyGroup(userId)));
    }

    // supervisor/admin — any group
    @GetMapping("/{groupId}")
    @PreAuthorize("hasAnyRole('supervisor','admin')")
    public ResponseEntity<?> getGroupById(@PathVariable UUID groupId) {
        return ResponseEntity.ok(Map.of("data", groupService.getGroupById(groupId)));
    }

    // admin or the group's assigned supervisor
    @PatchMapping("/{groupId}/leader")
    @PreAuthorize("hasAnyRole('admin','supervisor')")
    public ResponseEntity<?> setLeader(@PathVariable UUID groupId,
                                       @Valid @RequestBody SetGroupLeaderRequest req,
                                       Authentication auth) {
        UUID actingUserId = UUID.fromString((String) auth.getPrincipal());
        Claims claims = (Claims) auth.getDetails();
        String role = claims.get("role", String.class);
        Group g = groupService.setGroupLeader(groupId, actingUserId, role, req);
        return ResponseEntity.ok(Map.of("data", g));
    }

    // any member of the group
    @PostMapping(value = "/{groupId}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadPhoto(@PathVariable UUID groupId,
                                          @RequestParam("file") MultipartFile file,
                                          Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        return ResponseEntity.ok(Map.of("data", groupService.uploadPhoto(groupId, userId, file)));
    }

    // public — React Native's <Image> can't attach an Authorization header
    @GetMapping("/photos/{filename}")
    public ResponseEntity<byte[]> getPhoto(@PathVariable String filename) {
        byte[] bytes = groupService.readPhoto(filename);
        MediaType contentType = filename.endsWith(".png") ? MediaType.IMAGE_PNG
            : filename.endsWith(".webp") ? MediaType.valueOf("image/webp")
            : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, contentType.toString())
            .body(bytes);
    }
}
