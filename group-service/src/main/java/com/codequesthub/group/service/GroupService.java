package com.codequesthub.group.service;

import com.codequesthub.group.dto.*;
import com.codequesthub.group.entity.*;
import com.codequesthub.group.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class GroupService {

    private final GroupRepository groupRepo;
    private final GroupMemberRepository memberRepo;

    public GroupService(GroupRepository groupRepo, GroupMemberRepository memberRepo) {
        this.groupRepo = groupRepo;
        this.memberRepo = memberRepo;
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

    private Map<String, Object> buildGroupResponse(Group group, List<GroupMember> members) {
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", group.getId());
        resp.put("cohortId", group.getCohortId());
        resp.put("groupNumber", group.getGroupNumber());
        resp.put("name", group.getName());
        resp.put("supervisorId", group.getSupervisorId());
        resp.put("groupLeaderId", group.getGroupLeaderId());
        resp.put("createdAt", group.getCreatedAt());
        resp.put("members", members);
        return resp;
    }
}
