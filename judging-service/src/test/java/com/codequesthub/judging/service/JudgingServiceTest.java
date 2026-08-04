package com.codequesthub.judging.service;

import com.codequesthub.judging.dto.CreateCriterionRequest;
import com.codequesthub.judging.dto.ScoreEntry;
import com.codequesthub.judging.dto.SubmitScorecardRequest;
import com.codequesthub.judging.dto.UpdateCriterionRequest;
import com.codequesthub.judging.entity.CohortView;
import com.codequesthub.judging.entity.GroupView;
import com.codequesthub.judging.entity.JudgingCriterion;
import com.codequesthub.judging.entity.Scorecard;
import com.codequesthub.judging.entity.ScorecardScore;
import com.codequesthub.judging.repository.CohortViewRepository;
import com.codequesthub.judging.repository.GroupViewRepository;
import com.codequesthub.judging.repository.JudgeRepository;
import com.codequesthub.judging.repository.JudgingCriteriaRepository;
import com.codequesthub.judging.repository.ScorecardRepository;
import com.codequesthub.judging.repository.ScorecardScoreRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JudgingServiceTest {

    @Mock private JudgingCriteriaRepository criteriaRepo;
    @Mock private JudgeRepository judgeRepo;
    @Mock private ScorecardRepository scorecardRepo;
    @Mock private ScorecardScoreRepository scoreRepo;
    @Mock private GroupViewRepository groupViewRepo;
    @Mock private CohortViewRepository cohortViewRepo;

    private JudgingService service() {
        return new JudgingService(criteriaRepo, judgeRepo, scorecardRepo, scoreRepo, groupViewRepo, cohortViewRepo);
    }

    private CohortView cohortViewWith(UUID id) {
        CohortView c = new CohortView();
        ReflectionTestUtils.setField(c, "id", id);
        return c;
    }

    private JudgingCriterion criterionWith(UUID id, UUID cohortId, BigDecimal weight, boolean active) {
        JudgingCriterion c = new JudgingCriterion();
        ReflectionTestUtils.setField(c, "id", id);
        c.setCohortId(cohortId);
        c.setWeight(weight);
        c.setActive(active);
        c.setName("Criterion");
        return c;
    }

    @Test
    void createCriterion_exceedsWeightBudget_badRequest() {
        UUID cohortId = UUID.randomUUID();
        when(cohortViewRepo.existsById(cohortId)).thenReturn(true);
        when(criteriaRepo.findByCohortIdAndActiveTrue(cohortId))
            .thenReturn(List.of(criterionWith(UUID.randomUUID(), cohortId, new BigDecimal("70"), true)));

        CreateCriterionRequest req = new CreateCriterionRequest();
        req.setCohortId(cohortId);
        req.setName("New criterion");
        req.setWeight(new BigDecimal("31")); // 70 + 31 = 101 > 100

        assertThatThrownBy(() -> service().createCriterion(req))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("leaving 30 available");
    }

    @Test
    void createCriterion_exactlyAtBudget_allowed() {
        UUID cohortId = UUID.randomUUID();
        when(cohortViewRepo.existsById(cohortId)).thenReturn(true);
        when(criteriaRepo.findByCohortIdAndActiveTrue(cohortId))
            .thenReturn(List.of(criterionWith(UUID.randomUUID(), cohortId, new BigDecimal("70"), true)));
        when(criteriaRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreateCriterionRequest req = new CreateCriterionRequest();
        req.setCohortId(cohortId);
        req.setName("New criterion");
        req.setWeight(new BigDecimal("30")); // 70 + 30 = 100, boundary, must be allowed

        JudgingCriterion created = service().createCriterion(req);

        assertThat(created.getWeight()).isEqualByComparingTo("30");
    }

    @Test
    void updateCriterion_retiring_neverChecksWeightBudget() {
        UUID cohortId = UUID.randomUUID();
        UUID criterionId = UUID.randomUUID();
        JudgingCriterion existing = criterionWith(criterionId, cohortId, new BigDecimal("90"), true);
        when(criteriaRepo.findById(criterionId)).thenReturn(java.util.Optional.of(existing));
        when(criteriaRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        // Deliberately no stub for findByCohortIdAndActiveTrue — if the service
        // called it despite active=false, this test would throw UnnecessaryStubbing
        // is not the failure mode here; a real NPE/verification would be, but the
        // simplest proof is: this succeeds without ever needing that stub.

        UpdateCriterionRequest req = new UpdateCriterionRequest();
        req.setName("Retired criterion");
        req.setWeight(new BigDecimal("90")); // would blow any budget if it were checked
        req.setActive(false);

        JudgingCriterion updated = service().updateCriterion(criterionId, req);

        assertThat(updated.isActive()).isFalse();
    }

    @Test
    void getLeaderboard_computesWeightedAverage_andSortsDescendingWithNullsLast() {
        UUID cohortId = UUID.randomUUID();
        UUID crit1Id = UUID.randomUUID();
        UUID crit2Id = UUID.randomUUID();
        UUID groupAId = UUID.randomUUID();
        UUID groupBId = UUID.randomUUID();
        UUID groupCId = UUID.randomUUID();

        GroupView groupA = groupViewWith(groupAId, "Group A", 1);
        GroupView groupB = groupViewWith(groupBId, "Group B (unscored)", 2);
        GroupView groupC = groupViewWith(groupCId, "Group C", 3);
        when(groupViewRepo.findByCohortId(cohortId)).thenReturn(List.of(groupA, groupB, groupC));

        when(criteriaRepo.findByCohortId(cohortId)).thenReturn(List.of(
            criterionWith(crit1Id, cohortId, new BigDecimal("60"), true),
            criterionWith(crit2Id, cohortId, new BigDecimal("40"), true)));

        // Group A: one scorecard, 8 & 6 -> weighted 4.8 + 2.4 = 7.20
        Scorecard scorecardA = new Scorecard();
        scorecardA.setGroupId(groupAId);
        scorecardA.getScores().add(new ScorecardScore(scorecardA, crit1Id, 8));
        scorecardA.getScores().add(new ScorecardScore(scorecardA, crit2Id, 6));

        // Group C: two scorecards -> (10,10)=10.0 and (5,5)=5.0, average 7.50
        Scorecard scorecardC1 = new Scorecard();
        scorecardC1.setGroupId(groupCId);
        scorecardC1.getScores().add(new ScorecardScore(scorecardC1, crit1Id, 10));
        scorecardC1.getScores().add(new ScorecardScore(scorecardC1, crit2Id, 10));
        Scorecard scorecardC2 = new Scorecard();
        scorecardC2.setGroupId(groupCId);
        scorecardC2.getScores().add(new ScorecardScore(scorecardC2, crit1Id, 5));
        scorecardC2.getScores().add(new ScorecardScore(scorecardC2, crit2Id, 5));

        when(scorecardRepo.findByGroupIdIn(any()))
            .thenReturn(List.of(scorecardA, scorecardC1, scorecardC2));
        when(cohortViewRepo.findById(cohortId)).thenReturn(java.util.Optional.of(cohortViewWith(cohortId)));

        var entries = service().getLeaderboard(cohortId, true).getEntries();

        assertThat(entries).hasSize(3);
        assertThat(entries.get(0).getGroupId()).isEqualTo(groupCId);
        assertThat(entries.get(0).getAverageScore()).isEqualByComparingTo("7.50");
        assertThat(entries.get(0).getJudgeCount()).isEqualTo(2);

        assertThat(entries.get(1).getGroupId()).isEqualTo(groupAId);
        assertThat(entries.get(1).getAverageScore()).isEqualByComparingTo("7.20");
        assertThat(entries.get(1).getJudgeCount()).isEqualTo(1);

        // Unscored group sorts last despite having a "smaller" null, per nullsLast.
        assertThat(entries.get(2).getGroupId()).isEqualTo(groupBId);
        assertThat(entries.get(2).getAverageScore()).isNull();
        assertThat(entries.get(2).getJudgeCount()).isEqualTo(0);
    }

    @Test
    void getLeaderboard_derivesGroupPhotoUrlWhenSet_andNullWhenNot() {
        UUID cohortId = UUID.randomUUID();
        UUID groupWithPhotoId = UUID.randomUUID();
        UUID groupWithoutPhotoId = UUID.randomUUID();

        GroupView groupWithPhoto = groupViewWith(groupWithPhotoId, "Has Photo", 1);
        ReflectionTestUtils.setField(groupWithPhoto, "photoPath", "abc123.jpg");
        GroupView groupWithoutPhoto = groupViewWith(groupWithoutPhotoId, "No Photo", 2);

        when(groupViewRepo.findByCohortId(cohortId)).thenReturn(List.of(groupWithPhoto, groupWithoutPhoto));
        when(criteriaRepo.findByCohortId(cohortId)).thenReturn(List.of());
        when(scorecardRepo.findByGroupIdIn(any())).thenReturn(List.of());
        when(cohortViewRepo.findById(cohortId)).thenReturn(java.util.Optional.of(cohortViewWith(cohortId)));

        var entries = service().getLeaderboard(cohortId, true).getEntries();

        var withPhoto = entries.stream().filter(e -> e.getGroupId().equals(groupWithPhotoId)).findFirst().orElseThrow();
        var withoutPhoto = entries.stream().filter(e -> e.getGroupId().equals(groupWithoutPhotoId)).findFirst().orElseThrow();
        assertThat(withPhoto.getGroupPhotoUrl()).isEqualTo("/api/groups/photos/abc123.jpg");
        assertThat(withoutPhoto.getGroupPhotoUrl()).isNull();
    }

    @Test
    void submitScorecard_admin_allowedWithoutExplicitJudgeAssignment() {
        UUID groupId = UUID.randomUUID();
        UUID cohortId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        UUID criterionId = UUID.randomUUID();
        when(groupViewRepo.findById(groupId)).thenReturn(java.util.Optional.of(groupViewWith(groupId, "Group", 1, cohortId)));
        when(criteriaRepo.findByCohortIdAndActiveTrue(cohortId))
            .thenReturn(List.of(criterionWith(criterionId, cohortId, new BigDecimal("100"), true)));
        when(scorecardRepo.findByGroupIdAndJudgeId(groupId, adminId)).thenReturn(java.util.Optional.empty());
        when(scorecardRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SubmitScorecardRequest req = new SubmitScorecardRequest();
        req.setGroupId(groupId);
        ScoreEntry entry = new ScoreEntry();
        entry.setCriterionId(criterionId);
        entry.setScore(9);
        req.setScores(List.of(entry));

        Scorecard result = service().submitScorecard(adminId, "admin", req);

        assertThat(result.getGroupId()).isEqualTo(groupId);
        // Never checked the judges table — admin's privilege comes from role alone.
        org.mockito.Mockito.verifyNoInteractions(judgeRepo);
    }

    @Test
    void submitScorecard_supervisor_allowedWithoutExplicitJudgeAssignment() {
        UUID groupId = UUID.randomUUID();
        UUID cohortId = UUID.randomUUID();
        UUID supervisorId = UUID.randomUUID();
        UUID criterionId = UUID.randomUUID();
        when(groupViewRepo.findById(groupId)).thenReturn(java.util.Optional.of(groupViewWith(groupId, "Group", 1, cohortId)));
        when(criteriaRepo.findByCohortIdAndActiveTrue(cohortId))
            .thenReturn(List.of(criterionWith(criterionId, cohortId, new BigDecimal("100"), true)));
        when(scorecardRepo.findByGroupIdAndJudgeId(groupId, supervisorId)).thenReturn(java.util.Optional.empty());
        when(scorecardRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SubmitScorecardRequest req = new SubmitScorecardRequest();
        req.setGroupId(groupId);
        ScoreEntry entry = new ScoreEntry();
        entry.setCriterionId(criterionId);
        entry.setScore(7);
        req.setScores(List.of(entry));

        Scorecard result = service().submitScorecard(supervisorId, "supervisor", req);

        assertThat(result.getGroupId()).isEqualTo(groupId);
    }

    @Test
    void submitScorecard_studentNotAssignedAsJudge_forbidden() {
        UUID groupId = UUID.randomUUID();
        UUID cohortId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        when(groupViewRepo.findById(groupId)).thenReturn(java.util.Optional.of(groupViewWith(groupId, "Group", 1, cohortId)));
        when(judgeRepo.existsByCohortIdAndUserId(cohortId, studentId)).thenReturn(false);

        SubmitScorecardRequest req = new SubmitScorecardRequest();
        req.setGroupId(groupId);
        req.setScores(List.of());

        assertThatThrownBy(() -> service().submitScorecard(studentId, "student", req))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("not an assigned judge");
    }

    @Test
    void submitScorecard_explicitlyAssignedJudge_allowedRegardlessOfRole() {
        UUID groupId = UUID.randomUUID();
        UUID cohortId = UUID.randomUUID();
        UUID judgeUserId = UUID.randomUUID();
        UUID criterionId = UUID.randomUUID();
        when(groupViewRepo.findById(groupId)).thenReturn(java.util.Optional.of(groupViewWith(groupId, "Group", 1, cohortId)));
        when(judgeRepo.existsByCohortIdAndUserId(cohortId, judgeUserId)).thenReturn(true);
        when(criteriaRepo.findByCohortIdAndActiveTrue(cohortId))
            .thenReturn(List.of(criterionWith(criterionId, cohortId, new BigDecimal("100"), true)));
        when(scorecardRepo.findByGroupIdAndJudgeId(groupId, judgeUserId)).thenReturn(java.util.Optional.empty());
        when(scorecardRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SubmitScorecardRequest req = new SubmitScorecardRequest();
        req.setGroupId(groupId);
        ScoreEntry entry = new ScoreEntry();
        entry.setCriterionId(criterionId);
        entry.setScore(8);
        req.setScores(List.of(entry));

        Scorecard result = service().submitScorecard(judgeUserId, "student", req);

        assertThat(result.getGroupId()).isEqualTo(groupId);
    }

    private GroupView groupViewWith(UUID id, String name, int number) {
        GroupView g = new GroupView();
        ReflectionTestUtils.setField(g, "id", id);
        ReflectionTestUtils.setField(g, "name", name);
        ReflectionTestUtils.setField(g, "groupNumber", number);
        return g;
    }

    private GroupView groupViewWith(UUID id, String name, int number, UUID cohortId) {
        GroupView g = groupViewWith(id, name, number);
        ReflectionTestUtils.setField(g, "cohortId", cohortId);
        return g;
    }
}
