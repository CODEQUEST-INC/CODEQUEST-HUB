package com.codequesthub.group.controller;

import com.codequesthub.group.dto.CreateCohortRequest;
import com.codequesthub.group.dto.UpdateCohortRequest;
import com.codequesthub.group.entity.Cohort;
import com.codequesthub.group.service.CohortService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/cohorts")
public class CohortController {

    private final CohortService cohortService;

    public CohortController(CohortService cohortService) {
        this.cohortService = cohortService;
    }

    // admin only
    @PostMapping
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<?> createCohort(@Valid @RequestBody CreateCohortRequest req) {
        Cohort c = cohortService.createCohort(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", c));
    }

    // any authenticated user
    @GetMapping
    public ResponseEntity<?> listCohorts() {
        List<Cohort> cohorts = cohortService.listCohorts();
        return ResponseEntity.ok(Map.of("data", cohorts));
    }

    // any authenticated user
    @GetMapping("/{id}")
    public ResponseEntity<?> getCohort(@PathVariable UUID id) {
        Cohort c = cohortService.getCohort(id);
        return ResponseEntity.ok(Map.of("data", c));
    }

    // admin only
    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<?> updateCohort(@PathVariable UUID id, @Valid @RequestBody UpdateCohortRequest req) {
        Cohort c = cohortService.updateCohort(id, req);
        return ResponseEntity.ok(Map.of("data", c));
    }

    // admin only — blocked (not cascaded) if the cohort still has groups,
    // students, criteria, or judges attached
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<?> deleteCohort(@PathVariable UUID id) {
        cohortService.deleteCohort(id);
        return ResponseEntity.noContent().build();
    }
}
