package com.codequesthub.group.service;

import com.codequesthub.group.dto.*;
import com.codequesthub.group.entity.*;
import com.codequesthub.group.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Service
public class GroupService {

    private static final Map<String, String> ALLOWED_CONTENT_TYPES = Map.of(
        "image/jpeg", ".jpg",
        "image/png", ".png",
        "image/webp", ".webp"
    );

    private final GroupRepository groupRepo;
    private final GroupMemberRepository memberRepo;
    private final CohortRepository cohortRepo;
    private final UserViewRepository userViewRepo;
    private final Path uploadDir;

    public GroupService(GroupRepository groupRepo, GroupMemberRepository memberRepo,
                         CohortRepository cohortRepo, UserViewRepository userViewRepo,
                         @Value("${group.upload-dir}") String uploadDir) {
        this.groupRepo = groupRepo;
        this.memberRepo = memberRepo;
        this.cohortRepo = cohortRepo;
        this.userViewRepo = userViewRepo;
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create group upload directory: " + uploadDir, e);
        }
    }

    public Group setGroupLeader(UUID groupId, UUID actingUserId, String actingRole, SetGroupLeaderRequest req) {
        Group group = groupRepo.findById(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));

        if ("supervisor".equals(actingRole) && !actingUserId.equals(group.getSupervisorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You are not the assigned supervisor for this group");
        }

        if (!memberRepo.existsByGroupIdAndUserId(groupId, req.getUserId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "User is not a member of this group");
        }

        group.setGroupLeaderId(req.getUserId());
        return groupRepo.save(group);
    }

    public Group createGroup(CreateGroupRequest req) {
        if (groupRepo.existsByCohortIdAndGroupNumber(req.getCohortId(), req.getGroupNumber())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Group " + req.getGroupNumber() + " already exists for this cohort");
        }
        Group g = new Group();
        g.setCohortId(req.getCohortId());
        g.setGroupNumber(req.getGroupNumber());
        g.setName(req.getName());
        g.setSupervisorId(req.getSupervisorId());
        return groupRepo.save(g);
    }

    // Admin-only, destructive: dissolves every existing group in the cohort
    // (group_members cascades via the DB FK) and rebuilds them from scratch,
    // chunking all students tagged with this cohort into fixed-size groups
    // ordered by index number. Meant for initial group assignment, before any
    // group has proposals/tasks/scores attached — those cascade-delete too.
    @Transactional
    public Map<String, Object> autoGroup(UUID cohortId, AutoGroupRequest req) {
        if (!cohortRepo.existsById(cohortId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cohort not found");
        }

        List<UserView> students = new ArrayList<>(userViewRepo.findByCohortIdAndRole(cohortId, UserRole.student));
        if (students.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "No students are registered under this cohort");
        }
        students.sort(Comparator.comparingLong(u -> parseIndexNumber(u.getIndexNumber())));

        // flush() forces the deletes to hit the DB now — Hibernate's default
        // action ordering runs pending inserts before pending deletes, which
        // would otherwise collide with the (cohort_id, group_number) unique
        // constraint when the new groups 1..N are created below.
        groupRepo.deleteAll(groupRepo.findByCohortId(cohortId));
        groupRepo.flush();

        int groupSize = req.getGroupSize();
        List<Map<String, Object>> created = new ArrayList<>();
        int groupNumber = 1;
        for (int i = 0; i < students.size(); i += groupSize) {
            List<UserView> chunk = students.subList(i, Math.min(i + groupSize, students.size()));

            Group group = new Group();
            group.setCohortId(cohortId);
            group.setGroupNumber(groupNumber++);
            group = groupRepo.save(group);

            List<GroupMember> members = new ArrayList<>();
            for (UserView student : chunk) {
                GroupMember m = new GroupMember();
                m.setGroupId(group.getId());
                m.setUserId(student.getId());
                members.add(memberRepo.save(m));
            }
            created.add(buildGroupResponse(group, members));
        }

        return Map.of(
            "groupsCreated", created.size(),
            "studentsGrouped", students.size(),
            "groups", created
        );
    }

    private static long parseIndexNumber(String indexNumber) {
        if (indexNumber == null) return Long.MAX_VALUE;
        try {
            return Long.parseLong(indexNumber.trim());
        } catch (NumberFormatException e) {
            return Long.MAX_VALUE;
        }
    }

    public Map<String, Object> assignMembers(UUID groupId, AssignMembersRequest req) {
        Group group = groupRepo.findById(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));

        List<GroupMember> inserted = new ArrayList<>();
        for (UUID userId : req.getUserIds()) {
            if (!memberRepo.existsByGroupIdAndUserId(groupId, userId)) {
                GroupMember m = new GroupMember();
                m.setGroupId(groupId);
                m.setUserId(userId);
                inserted.add(memberRepo.save(m));
            }
        }
        return Map.of("added", inserted.size(), "members", inserted);
    }

    public Map<String, Object> getMyGroup(UUID userId) {
        GroupMember membership = memberRepo.findByUserId(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "You are not currently assigned to a group"));

        Group group = groupRepo.findById(membership.getGroupId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));

        List<GroupMember> members = memberRepo.findByGroupId(group.getId());
        return buildGroupResponse(group, members);
    }

    public Map<String, Object> getGroupById(UUID groupId) {
        Group group = groupRepo.findById(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
        List<GroupMember> members = memberRepo.findByGroupId(groupId);
        return buildGroupResponse(group, members);
    }

    public List<Map<String, Object>> listByCohort(UUID cohortId) {
        return groupRepo.findByCohortId(cohortId).stream()
            .map(group -> buildGroupResponse(group, memberRepo.findByGroupId(group.getId())))
            .toList();
    }

    // Any member of the group can set/replace its photo — no leader/supervisor
    // gate, matching the "keep it simple" call on this one.
    public Map<String, Object> uploadPhoto(UUID groupId, UUID userId, MultipartFile file) {
        Group group = groupRepo.findById(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));

        if (!memberRepo.existsByGroupIdAndUserId(groupId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this group");
        }

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file uploaded");
        }
        String extension = ALLOWED_CONTENT_TYPES.get(file.getContentType());
        if (extension == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Unsupported image type. Allowed: jpeg, png, webp");
        }

        String oldPhotoPath = group.getPhotoPath();
        String filename = UUID.randomUUID() + extension;
        try {
            Files.write(uploadDir.resolve(filename), file.getBytes());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save photo");
        }

        group.setPhotoPath(filename);
        Group saved = groupRepo.save(group);

        if (oldPhotoPath != null) {
            deleteFileQuietly(oldPhotoPath);
        }

        return buildGroupResponse(saved, memberRepo.findByGroupId(groupId));
    }

    public byte[] readPhoto(String filename) {
        Path path = uploadDir.resolve(filename).normalize();
        if (!path.startsWith(uploadDir) || !Files.exists(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found");
        }
        try {
            return Files.readAllBytes(path);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not read photo");
        }
    }

    private void deleteFileQuietly(String filename) {
        try {
            Files.deleteIfExists(uploadDir.resolve(filename));
        } catch (IOException ignored) {
            // best-effort cleanup only
        }
    }

    private Map<String, Object> buildGroupResponse(Group group, List<GroupMember> members) {
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", group.getId());
        resp.put("cohortId", group.getCohortId());
        resp.put("groupNumber", group.getGroupNumber());
        resp.put("name", group.getName());
        resp.put("supervisorId", group.getSupervisorId());
        resp.put("groupLeaderId", group.getGroupLeaderId());
        resp.put("photoUrl", group.getPhotoPath() == null ? null : "/api/groups/photos/" + group.getPhotoPath());
        resp.put("createdAt", group.getCreatedAt());
        resp.put("members", members);
        return resp;
    }
}
