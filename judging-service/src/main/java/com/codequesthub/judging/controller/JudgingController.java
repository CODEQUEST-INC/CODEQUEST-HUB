package com.codequesthub.judging.controller;

import com.codequesthub.judging.dto.*;
import com.codequesthub.judging.entity.Judge;
import com.codequesthub.judging.entity.JudgingCriterion;
import com.codequesthub.judging.entity.Scorecard;
import com.codequesthub.judging.service.JudgingService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/judging")
public class JudgingController {

    private final JudgingService judgingService;

    public JudgingController(JudgingService judgingService) {
        this.judgingService = judgingService;
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "service", "judging-service"));
    }

    // ---- criteria (admin configures) ----

    @PostMapping("/criteria")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<?> createCriterion(@Valid @RequestBody CreateCriterionRequest req) {
        JudgingCriterion c = judgingService.createCriterion(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", c));
    }

    @GetMapping("/criteria")
    public ResponseEntity<?> listCriteria(@RequestParam UUID cohortId) {
        List<JudgingCriterion> criteria = judgingService.listCriteria(cohortId);
        return ResponseEntity.ok(Map.of("data", criteria));
    }

    @PatchMapping("/criteria/{criterionId}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<?> updateCriterion(@PathVariable UUID criterionId, @Valid @RequestBody UpdateCriterionRequest req) {
        JudgingCriterion c = judgingService.updateCriterion(criterionId, req);
        return ResponseEntity.ok(Map.of("data", c));
    }

    @DeleteMapping("/criteria/{criterionId}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<?> deleteCriterion(@PathVariable UUID criterionId) {
        judgingService.deleteCriterion(criterionId);
        return ResponseEntity.noContent().build();
    }

    // ---- judges (admin assigns) ----

    @PostMapping("/judges")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<?> assignJudge(@Valid @RequestBody AssignJudgeRequest req) {
        Judge j = judgingService.assignJudge(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", j));
    }

    @GetMapping("/judges")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<?> listJudges(@RequestParam UUID cohortId) {
        List<Judge> judges = judgingService.listJudges(cohortId);
        return ResponseEntity.ok(Map.of("data", judges));
    }

    @DeleteMapping("/judges/{judgeAssignmentId}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<?> removeJudge(@PathVariable UUID judgeAssignmentId) {
        judgingService.removeJudge(judgeAssignmentId);
        return ResponseEntity.noContent().build();
    }

    // ---- scorecards (any assigned judge — checked in the service layer) ----

    @PostMapping("/scorecards")
    public ResponseEntity<?> submitScorecard(@Valid @RequestBody SubmitScorecardRequest req, Authentication auth) {
        UUID judgeUserId = UUID.fromString((String) auth.getPrincipal());
        Scorecard s = judgingService.submitScorecard(judgeUserId, roleOf(auth), req);
        return ResponseEntity.ok(Map.of("data", s));
    }

    @GetMapping("/scorecards/my")
    public ResponseEntity<?> getMyScorecard(@RequestParam UUID groupId, Authentication auth) {
        UUID judgeUserId = UUID.fromString((String) auth.getPrincipal());
        return judgingService.getMyScorecard(judgeUserId, groupId)
            .map(s -> ResponseEntity.ok(Map.of("data", s)))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/scorecards/group/{groupId}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<?> getScorecardsForGroup(@PathVariable UUID groupId) {
        List<Scorecard> scorecards = judgingService.getScorecardsForGroup(groupId);
        return ResponseEntity.ok(Map.of("data", scorecards));
    }

    // ---- leaderboard (any authenticated user) ----

    @GetMapping("/leaderboard")
    public ResponseEntity<?> getLeaderboard(@RequestParam UUID cohortId) {
        List<LeaderboardEntry> leaderboard = judgingService.getLeaderboard(cohortId);
        return ResponseEntity.ok(Map.of("data", leaderboard));
    }

    private String roleOf(Authentication auth) {
        Claims claims = (Claims) auth.getDetails();
        return claims.get("role", String.class);
    }
}
