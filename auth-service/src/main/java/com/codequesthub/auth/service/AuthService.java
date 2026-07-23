package com.codequesthub.auth.service;

import com.codequesthub.auth.dto.*;
import com.codequesthub.auth.entity.User;
import com.codequesthub.auth.entity.UserRole;
import com.codequesthub.auth.repository.CohortViewRepository;
import com.codequesthub.auth.repository.GroupMemberViewRepository;
import com.codequesthub.auth.repository.GroupViewRepository;
import com.codequesthub.auth.repository.JudgeViewRepository;
import com.codequesthub.auth.repository.PaymentRecordViewRepository;
import com.codequesthub.auth.repository.ProposalVersionViewRepository;
import com.codequesthub.auth.repository.ProposalViewRepository;
import com.codequesthub.auth.repository.ScorecardViewRepository;
import com.codequesthub.auth.repository.ShowcaseEntryViewRepository;
import com.codequesthub.auth.repository.TaskViewRepository;
import com.codequesthub.auth.repository.UserRepository;
import com.codequesthub.common.security.JwtUtil;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepo;
    private final CohortViewRepository cohortViewRepo;
    private final GroupMemberViewRepository groupMemberViewRepo;
    private final GroupViewRepository groupViewRepo;
    private final ProposalViewRepository proposalViewRepo;
    private final ProposalVersionViewRepository proposalVersionViewRepo;
    private final TaskViewRepository taskViewRepo;
    private final ShowcaseEntryViewRepository showcaseEntryViewRepo;
    private final JudgeViewRepository judgeViewRepo;
    private final ScorecardViewRepository scorecardViewRepo;
    private final PaymentRecordViewRepository paymentRecordViewRepo;
    private final PasswordEncoder encoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepo, CohortViewRepository cohortViewRepo,
                       GroupMemberViewRepository groupMemberViewRepo, GroupViewRepository groupViewRepo,
                       ProposalViewRepository proposalViewRepo, ProposalVersionViewRepository proposalVersionViewRepo,
                       TaskViewRepository taskViewRepo, ShowcaseEntryViewRepository showcaseEntryViewRepo,
                       JudgeViewRepository judgeViewRepo, ScorecardViewRepository scorecardViewRepo,
                       PaymentRecordViewRepository paymentRecordViewRepo,
                       PasswordEncoder encoder, JwtUtil jwtUtil) {
        this.userRepo = userRepo;
        this.cohortViewRepo = cohortViewRepo;
        this.groupMemberViewRepo = groupMemberViewRepo;
        this.groupViewRepo = groupViewRepo;
        this.proposalViewRepo = proposalViewRepo;
        this.proposalVersionViewRepo = proposalVersionViewRepo;
        this.taskViewRepo = taskViewRepo;
        this.showcaseEntryViewRepo = showcaseEntryViewRepo;
        this.judgeViewRepo = judgeViewRepo;
        this.scorecardViewRepo = scorecardViewRepo;
        this.paymentRecordViewRepo = paymentRecordViewRepo;
        this.encoder = encoder;
        this.jwtUtil = jwtUtil;
    }

    public AuthResponse register(RegisterRequest req) {
        if (userRepo.existsByEmail(req.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "An account with this email already exists");
        }

        UserRole role = req.getRole() != null ? req.getRole() : UserRole.student;

        // Index number, student ID, and cohort all need to be present on every
        // student — not required for other roles. Index number/cohort back
        // automated grouping; student ID is the university reference number.
        if (role == UserRole.student) {
            if (req.getIndexNumber() == null || req.getIndexNumber().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Index number is required for students");
            }
            if (req.getStudentId() == null || req.getStudentId().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Student ID is required for students");
            }
            if (req.getCohortId() == null || !cohortViewRepo.existsById(req.getCohortId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A valid cohort is required for students");
            }
        }

        User user = new User();
        user.setFullName(req.getFullName());
        user.setEmail(req.getEmail());
        user.setPasswordHash(encoder.encode(req.getPassword()));
        user.setRole(role);
        user.setStudentId(req.getStudentId());
        user.setIndexNumber(req.getIndexNumber());
        user.setCohortId(req.getCohortId());

        user = userRepo.save(user);

        String token = jwtUtil.generateToken(
            user.getId().toString(), user.getEmail(), user.getRole().name());

        return new AuthResponse(UserResponse.from(user), token);
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepo.findByEmail(req.getEmail())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Email or password is incorrect"));

        if (!encoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Email or password is incorrect");
        }

        String token = jwtUtil.generateToken(
            user.getId().toString(), user.getEmail(), user.getRole().name());

        return new AuthResponse(UserResponse.from(user), token);
    }

    public UserResponse me(String userId) {
        return userRepo.findById(java.util.UUID.fromString(userId))
            .map(UserResponse::from)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    // Minimal-disclosure bulk lookup (id + fullName only) so other services/clients
    // can resolve the user IDs they store (group members, task assignees, etc.)
    // to display names without exposing email/role/studentId.
    public java.util.List<UserSummaryResponse> lookupUsers(java.util.List<java.util.UUID> ids) {
        return userRepo.findAllById(ids).stream()
            .map(UserSummaryResponse::from)
            .toList();
    }

    // Backs an admin type-ahead picker (assign judge/member/supervisor by name
    // instead of pasting a UUID) — blank/short queries return nothing rather
    // than the whole directory.
    public java.util.List<UserSearchResult> searchUsers(String q, UserRole role) {
        if (q == null || q.trim().length() < 2) {
            return java.util.List.of();
        }
        String trimmed = q.trim();
        var page = PageRequest.of(0, 20);
        var results = role != null ? userRepo.searchByRole(trimmed, role, page) : userRepo.search(trimmed, page);
        return results.stream()
            .map(UserSearchResult::from)
            .toList();
    }

    // The whole backend shares one physical database — no cascade/sync jobs
    // exist for the tables that reference a user across services, so a plain
    // delete would either raw-FK-violate (submitted_by/reviewed_by/actor_id/
    // created_by/payment user_id have no ON DELETE clause) or silently destroy
    // group-membership/judging data (the CASCADE columns) or orphan group
    // leadership/supervision/task assignment (the SET NULL columns). Block on
    // ANY of these instead of cascading, naming everything in the way at once —
    // same convention as CohortService.deleteCohort in group-service.
    public void deleteUser(java.util.UUID id, java.util.UUID callerId) {
        User user = userRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (id.equals(callerId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot delete your own account");
        }

        java.util.List<String> blockers = new java.util.ArrayList<>();
        if (groupMemberViewRepo.existsByUserId(id)) blockers.add("group membership");
        if (groupViewRepo.existsBySupervisorId(id) || groupViewRepo.existsByGroupLeaderId(id)) {
            blockers.add("group supervision or leadership");
        }
        if (proposalViewRepo.existsBySubmittedBy(id) || proposalViewRepo.existsByReviewedBy(id)) {
            blockers.add("submitted or reviewed proposals");
        }
        if (proposalVersionViewRepo.existsByActorId(id)) blockers.add("proposal review history");
        if (taskViewRepo.existsByAssigneeId(id) || taskViewRepo.existsByCreatedBy(id)) {
            blockers.add("assigned or created tasks");
        }
        if (showcaseEntryViewRepo.existsByCreatedBy(id)) blockers.add("showcase entries");
        if (judgeViewRepo.existsByUserId(id) || scorecardViewRepo.existsByJudgeId(id)) {
            blockers.add("judging assignments");
        }
        if (paymentRecordViewRepo.existsByUserId(id)) blockers.add("payment records");

        if (!blockers.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Cannot delete this account — they still have " + String.join(", ", blockers) + ". Remove these first.");
        }

        userRepo.delete(user);
    }
}
