package com.codequesthub.group.service;

import com.codequesthub.group.dto.CreateCohortRequest;
import com.codequesthub.group.dto.UpdateCohortRequest;
import com.codequesthub.group.entity.Cohort;
import com.codequesthub.group.repository.CohortRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class CohortService {

    private final CohortRepository cohortRepo;

    public CohortService(CohortRepository cohortRepo) {
        this.cohortRepo = cohortRepo;
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
}
