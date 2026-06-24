package com.codequesthub.judging.service;

import com.codequesthub.judging.dto.*;
import com.codequesthub.judging.entity.*;
import com.codequesthub.judging.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class JudgingService {

    private final JudgingCriteriaRepository criteriaRepo;
    private final JudgeRepository judgeRepo;
    private final ScorecardRepository scorecardRepo;
    private final ScorecardScoreRepository scoreRepo;
    private final GroupViewRepository groupViewRepo;
    private final CohortViewRepository cohortViewRepo;

    public JudgingService(JudgingCriteriaRepository criteriaRepo,
                           JudgeRepository judgeRepo,
                           ScorecardRepository scorecardRepo,
                           ScorecardScoreRepository scoreRepo,
                           GroupViewRepository groupViewRepo,
                           CohortViewRepository cohortViewRepo) {
        this.criteriaRepo = criteriaRepo;
        this.judgeRepo = judgeRepo;
        this.scorecardRepo = scorecardRepo;
        this.scoreRepo = scoreRepo;
        this.groupViewRepo = groupViewRepo;
        this.cohortViewRepo = cohortViewRepo;
    }

    // ============================================================
    // CRITERIA  (admin)
    // ============================================================

    @Transactional
    public JudgingCriterion createCriterion(CreateCriterionRequest req) {
        findCohortOr404(req.getCohortId());
        checkWeightBudget(req.getCohortId(), req.getWeight(), null);

        JudgingCriterion c = new JudgingCriterion();
        c.setCohortId(req.getCohortId());
        c.setName(req.getName());
        c.setWeight(req.getWeight());
        return criteriaRepo.save(c);
    }

    public List<JudgingCriterion> listCriteria(UUID cohortId) {
        return criteriaRepo.findByCohortId(cohortId);
    }

    @Transactional
    public JudgingCriterion updateCriterion(UUID criterionId, UpdateCriterionRequest req) {
        JudgingCriterion c = findCriterionOr404(criterionId);
        checkWeightBudget(c.getCohortId(), req.getWeight(), criterionId);
        c.setName(req.getName());
        c.setWeight(req.getWeight());
        return criteriaRepo.save(c);
    }

    @Transactional
    public void deleteCriterion(UUID criterionId) {
        JudgingCriterion c = findCriterionOr404(criterionId);
        if (scoreRepo.existsByCriterionId(criterionId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Cannot delete a criterion that already has submitted scores");
        }
        criteriaRepo.delete(c);
    }

    // A cohort's criteria weights must never exceed 100 in total.
    private void checkWeightBudget(UUID cohortId, BigDecimal incomingWeight, UUID excludingCriterionId) {
        BigDecimal existingTotal = criteriaRepo.findByCohortId(cohortId).stream()
            .filter(c -> excludingCriterionId == null || !c.getId().equals(excludingCriterionId))
            .map(JudgingCriterion::getWeight)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (existingTotal.add(incomingWeight).compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Total criteria weight for this cohort cannot exceed 100 (currently "
                    + existingTotal + ", adding " + incomingWeight + ")");
        }
    }

    // ============================================================
    // JUDGES  (admin)
    // ============================================================

    @Transactional
    public Judge assignJudge(AssignJudgeRequest req) {
        findCohortOr404(req.getCohortId());
        if (judgeRepo.existsByCohortIdAndUserId(req.getCohortId(), req.getUserId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This user is already a judge for this cohort");
        }
        Judge j = new Judge();
        j.setCohortId(req.getCohortId());
        j.setUserId(req.getUserId());
        return judgeRepo.save(j);
    }

    public List<Judge> listJudges(UUID cohortId) {
        return judgeRepo.findByCohortId(cohortId);
    }

    @Transactional
    public void removeJudge(UUID judgeAssignmentId) {
        Judge j = judgeRepo.findById(judgeAssignmentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Judge assignment not found"));
        judgeRepo.delete(j);
    }

    // ============================================================
    // SCORECARDS
    // ============================================================

    @Transactional
    public Scorecard submitScorecard(UUID judgeUserId, SubmitScorecardRequest req) {
        GroupView group = groupViewRepo.findById(req.getGroupId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));

        if (!judgeRepo.existsByCohortIdAndUserId(group.getCohortId(), judgeUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You are not an assigned judge for this group's cohort");
        }

        List<JudgingCriterion> criteria = criteriaRepo.findByCohortId(group.getCohortId());
        if (criteria.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "No judging criteria have been configured for this cohort yet");
        }
        Set<UUID> expectedCriterionIds = criteria.stream().map(JudgingCriterion::getId).collect(Collectors.toSet());
        Set<UUID> submittedCriterionIds = req.getScores().stream().map(ScoreEntry::getCriterionId).collect(Collectors.toSet());

        if (!expectedCriterionIds.equals(submittedCriterionIds)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Scorecard must include exactly one score for each of this cohort's criteria");
        }

        Scorecard scorecard = scorecardRepo.findByGroupIdAndJudgeId(req.getGroupId(), judgeUserId)
            .orElseGet(() -> {
                Scorecard s = new Scorecard();
                s.setGroupId(req.getGroupId());
                s.setJudgeId(judgeUserId);
                return s;
            });

        if (scorecard.getId() != null) {
            // Flush the orphan-removal deletes before inserting the new rows, otherwise
            // Hibernate orders the new inserts first and trips the (scorecard_id, criterion_id)
            // unique constraint against the not-yet-deleted old rows.
            scorecard.getScores().clear();
            scorecardRepo.saveAndFlush(scorecard);
        }

        for (ScoreEntry entry : req.getScores()) {
            scorecard.getScores().add(new ScorecardScore(scorecard, entry.getCriterionId(), entry.getScore()));
        }

        return scorecardRepo.save(scorecard);
    }

    public Optional<Scorecard> getMyScorecard(UUID judgeUserId, UUID groupId) {
        return scorecardRepo.findByGroupIdAndJudgeId(groupId, judgeUserId);
    }

    public List<Scorecard> getScorecardsForGroup(UUID groupId) {
        return scorecardRepo.findByGroupId(groupId);
    }

    // ============================================================
    // LEADERBOARD  (admin)
    // ============================================================

    public List<LeaderboardEntry> getLeaderboard(UUID cohortId) {
        List<GroupView> groups = groupViewRepo.findByCohortId(cohortId);
        if (groups.isEmpty()) return List.of();

        Map<UUID, BigDecimal> weightByCriterion = criteriaRepo.findByCohortId(cohortId).stream()
            .collect(Collectors.toMap(JudgingCriterion::getId, JudgingCriterion::getWeight));

        List<UUID> groupIds = groups.stream().map(GroupView::getId).toList();
        Map<UUID, List<Scorecard>> scorecardsByGroup = scorecardRepo.findByGroupIdIn(groupIds).stream()
            .collect(Collectors.groupingBy(Scorecard::getGroupId));

        List<LeaderboardEntry> entries = new ArrayList<>();
        for (GroupView group : groups) {
            List<Scorecard> scorecards = scorecardsByGroup.getOrDefault(group.getId(), List.of());

            List<BigDecimal> weightedSums = scorecards.stream()
                .map(sc -> weightedSumOf(sc, weightByCriterion))
                .toList();

            BigDecimal average = weightedSums.isEmpty()
                ? null
                : weightedSums.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(weightedSums.size()), 2, RoundingMode.HALF_UP);

            entries.add(new LeaderboardEntry(group.getId(), group.getName(), group.getGroupNumber(),
                average, scorecards.size()));
        }

        entries.sort(Comparator.comparing(LeaderboardEntry::getAverageScore,
            Comparator.nullsLast(Comparator.reverseOrder())));
        return entries;
    }

    // weighted sum = sum(score * weight / 100) across the scorecard's criteria
    private BigDecimal weightedSumOf(Scorecard scorecard, Map<UUID, BigDecimal> weightByCriterion) {
        return scorecard.getScores().stream()
            .map(score -> {
                BigDecimal weight = weightByCriterion.getOrDefault(score.getCriterionId(), BigDecimal.ZERO);
                return BigDecimal.valueOf(score.getScore())
                    .multiply(weight)
                    .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private JudgingCriterion findCriterionOr404(UUID id) {
        return criteriaRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Criterion not found"));
    }

    private void findCohortOr404(UUID cohortId) {
        if (!cohortViewRepo.existsById(cohortId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cohort not found");
        }
    }
}
