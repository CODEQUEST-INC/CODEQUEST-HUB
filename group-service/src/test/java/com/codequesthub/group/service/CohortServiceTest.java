package com.codequesthub.group.service;

import com.codequesthub.group.dto.CreateCohortRequest;
import com.codequesthub.group.dto.UpdateCohortRequest;
import com.codequesthub.group.entity.Cohort;
import com.codequesthub.group.repository.CohortRepository;
import com.codequesthub.group.repository.GroupRepository;
import com.codequesthub.group.repository.JudgeViewRepository;
import com.codequesthub.group.repository.JudgingCriterionViewRepository;
import com.codequesthub.group.repository.UserViewRepository;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CohortServiceTest {

    @Mock private CohortRepository cohortRepo;
    @Mock private GroupRepository groupRepo;
    @Mock private UserViewRepository userViewRepo;
    @Mock private JudgingCriterionViewRepository criterionViewRepo;
    @Mock private JudgeViewRepository judgeViewRepo;

    private CohortService service() {
        return new CohortService(cohortRepo, groupRepo, userViewRepo, criterionViewRepo, judgeViewRepo);
    }

    private Cohort cohortWith(UUID id) {
        Cohort c = new Cohort();
        ReflectionTestUtils.setField(c, "id", id);
        return c;
    }

    @Test
    void deleteCohort_notFound_404() {
        UUID id = UUID.randomUUID();
        when(cohortRepo.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().deleteCohort(id))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Cohort not found");
    }

    @Test
    void deleteCohort_hasGroups_blocked() {
        UUID id = UUID.randomUUID();
        when(cohortRepo.findById(id)).thenReturn(Optional.of(cohortWith(id)));
        when(groupRepo.existsByCohortId(id)).thenReturn(true);

        assertThatThrownBy(() -> service().deleteCohort(id))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("groups");
        verify(cohortRepo, never()).delete(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void deleteCohort_hasRegisteredStudents_blocked() {
        UUID id = UUID.randomUUID();
        when(cohortRepo.findById(id)).thenReturn(Optional.of(cohortWith(id)));
        when(groupRepo.existsByCohortId(id)).thenReturn(false);
        when(userViewRepo.existsByCohortId(id)).thenReturn(true);

        assertThatThrownBy(() -> service().deleteCohort(id))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("registered students");
    }

    @Test
    void deleteCohort_hasCriteriaAndJudges_blockedWithBothNamed() {
        UUID id = UUID.randomUUID();
        when(cohortRepo.findById(id)).thenReturn(Optional.of(cohortWith(id)));
        when(groupRepo.existsByCohortId(id)).thenReturn(false);
        when(userViewRepo.existsByCohortId(id)).thenReturn(false);
        when(criterionViewRepo.existsByCohortId(id)).thenReturn(true);
        when(judgeViewRepo.existsByCohortId(id)).thenReturn(true);

        assertThatThrownBy(() -> service().deleteCohort(id))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("judging criteria")
            .hasMessageContaining("assigned judges");
    }

    @Test
    void deleteCohort_nothingAttached_succeeds() {
        UUID id = UUID.randomUUID();
        Cohort cohort = cohortWith(id);
        when(cohortRepo.findById(id)).thenReturn(Optional.of(cohort));
        when(groupRepo.existsByCohortId(id)).thenReturn(false);
        when(userViewRepo.existsByCohortId(id)).thenReturn(false);
        when(criterionViewRepo.existsByCohortId(id)).thenReturn(false);
        when(judgeViewRepo.existsByCohortId(id)).thenReturn(false);

        service().deleteCohort(id);

        verify(cohortRepo).delete(cohort);
    }

    @Test
    void createCohort_alwaysStartsInactive() {
        when(cohortRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        CreateCohortRequest req = new CreateCohortRequest();
        req.setName("CodeQuest 2027");
        req.setYear(2027);

        Cohort created = service().createCohort(req);

        assertThat(created.isActive()).isFalse();
        verify(cohortRepo, never()).deactivateAllExcept(any());
    }

    @Test
    void updateCohort_activatingIt_deactivatesEveryOtherCohortFirst() {
        UUID id = UUID.randomUUID();
        Cohort cohort = cohortWith(id);
        when(cohortRepo.findById(id)).thenReturn(Optional.of(cohort));
        when(cohortRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateCohortRequest req = new UpdateCohortRequest();
        req.setName("CodeQuest 2026");
        req.setYear(2026);
        req.setActive(true);

        Cohort updated = service().updateCohort(id, req);

        verify(cohortRepo).deactivateAllExcept(id);
        assertThat(updated.isActive()).isTrue();
    }

    @Test
    void updateCohort_deactivatingIt_doesNotTouchOtherCohorts() {
        UUID id = UUID.randomUUID();
        Cohort cohort = cohortWith(id);
        when(cohortRepo.findById(id)).thenReturn(Optional.of(cohort));
        when(cohortRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateCohortRequest req = new UpdateCohortRequest();
        req.setName("CodeQuest 2026");
        req.setYear(2026);
        req.setActive(false);

        Cohort updated = service().updateCohort(id, req);

        verify(cohortRepo, never()).deactivateAllExcept(any());
        assertThat(updated.isActive()).isFalse();
    }
}
