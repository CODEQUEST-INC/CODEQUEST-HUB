package com.codequesthub.group.service;

import com.codequesthub.group.dto.CreateCohortRequest;
import com.codequesthub.group.dto.UpdateCohortRequest;
import com.codequesthub.group.entity.Cohort;
import com.codequesthub.group.repository.CohortRepository;
import com.codequesthub.group.repository.GroupRepository;
import com.codequesthub.group.repository.JudgeViewRepository;
import com.codequesthub.group.repository.JudgingCriterionViewRepository;
import com.codequesthub.group.repository.UserViewRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class CohortService {

    private final CohortRepository cohortRepo;
    private final GroupRepository groupRepo;
    private final UserViewRepository userViewRepo;
    private final JudgingCriterionViewRepository criterionViewRepo;
    private final JudgeViewRepository judgeViewRepo;

    public CohortService(CohortRepository cohortRepo, GroupRepository groupRepo, UserViewRepository userViewRepo,
                          JudgingCriterionViewRepository criterionViewRepo, JudgeViewRepository judgeViewRepo) {
        this.cohortRepo = cohortRepo;
        this.groupRepo = groupRepo;
        this.userViewRepo = userViewRepo;
        this.criterionViewRepo = criterionViewRepo;
        this.judgeViewRepo = judgeViewRepo;
    }

    @Transactional
    public Cohort createCohort(CreateCohortRequest req) {
        Cohort c = new Cohort();
        c.setName(req.getName());
        c.setYear(req.getYear());
        return cohortRepo.save(c);
    }

    public List<Cohort> listCohorts() {
        return cohortRepo.findAll();
    }

    public Cohort getCohort(UUID id) {
        return cohortRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cohort not found"));
    }

    @Transactional
    public Cohort updateCohort(UUID id, UpdateCohortRequest req) {
        Cohort c = getCohort(id);
        c.setName(req.getName());
        c.setYear(req.getYear());
        c.setActive(req.getActive());
        return cohortRepo.save(c);
    }

    // The DB's own FK cascades are inconsistent here (groups/criteria/judges cascade-delete,
    // students' cohort_id doesn't) — a plain delete would silently wipe a cohort's groups,
    // and everything hanging off them (tasks, proposals, scores, showcase entries), while only
    // sometimes blocking on students. Block explicitly on ANY dependent data instead, and name
    // everything that's in the way in one message rather than making the caller retry blind.
    @Transactional
    public void deleteCohort(UUID id) {
        Cohort cohort = getCohort(id);

        List<String> blockers = new ArrayList<>();
        if (groupRepo.existsByCohortId(id)) blockers.add("groups");
        if (userViewRepo.existsByCohortId(id)) blockers.add("registered students");
        if (criterionViewRepo.existsByCohortId(id)) blockers.add("judging criteria");
        if (judgeViewRepo.existsByCohortId(id)) blockers.add("assigned judges");

        if (!blockers.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Cannot delete this cohort — it still has " + String.join(", ", blockers) + ". Remove these first.");
        }

        cohortRepo.delete(cohort);
    }
}
