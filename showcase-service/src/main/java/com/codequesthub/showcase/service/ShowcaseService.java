package com.codequesthub.showcase.service;

import com.codequesthub.showcase.dto.*;
import com.codequesthub.showcase.entity.*;
import com.codequesthub.showcase.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ShowcaseService {

    // Simple gallery, no cover-photo concept — just capped so one group can't
    // fill the showcase with dozens of screenshots.
    private static final int MAX_PHOTOS_PER_ENTRY = 5;

    private static final Map<String, String> ALLOWED_CONTENT_TYPES = Map.of(
        "image/jpeg", ".jpg",
        "image/png", ".png",
        "image/webp", ".webp"
    );

    private final ShowcaseEntryRepository entryRepo;
    private final ShowcasePhotoRepository photoRepo;
    private final GroupViewRepository groupViewRepo;
    private final GroupMemberRepository memberRepo;
    private final ProposalViewRepository proposalViewRepo;
    private final CohortViewRepository cohortViewRepo;
    private final JudgingCriterionViewRepository criterionViewRepo;
    private final ScorecardViewRepository scorecardViewRepo;
    private final Path uploadDir;

    public ShowcaseService(ShowcaseEntryRepository entryRepo,
                            ShowcasePhotoRepository photoRepo,
                            GroupViewRepository groupViewRepo,
                            GroupMemberRepository memberRepo,
                            ProposalViewRepository proposalViewRepo,
                            CohortViewRepository cohortViewRepo,
                            JudgingCriterionViewRepository criterionViewRepo,
                            ScorecardViewRepository scorecardViewRepo,
                            @Value("${showcase.upload-dir}") String uploadDir) {
        this.entryRepo = entryRepo;
        this.photoRepo = photoRepo;
        this.groupViewRepo = groupViewRepo;
        this.memberRepo = memberRepo;
        this.proposalViewRepo = proposalViewRepo;
        this.cohortViewRepo = cohortViewRepo;
        this.criterionViewRepo = criterionViewRepo;
        this.scorecardViewRepo = scorecardViewRepo;
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create showcase upload directory: " + uploadDir, e);
        }
    }

    @Transactional
    public ShowcaseEntryResponse upsertEntry(UUID groupId, UUID userId, UpsertShowcaseRequest req) {
        GroupView group = checkMemberAndApproved(groupId, userId);

        ShowcaseEntry entry = entryRepo.findByGroupId(groupId).orElseGet(() -> {
            ShowcaseEntry e = new ShowcaseEntry();
            e.setGroupId(groupId);
            e.setCohortId(group.getCohortId());
            e.setCreatedBy(userId);
            return e;
        });

        entry.setTitle(req.getTitle());
        entry.setDescription(req.getDescription());
        entry.setGithubUrl(req.getGithubUrl());
        ShowcaseEntry saved = entryRepo.save(entry);
        return toResponse(saved, group);
    }

    @Transactional
    public ShowcaseEntryResponse addPhoto(UUID groupId, UUID userId, MultipartFile file) {
        GroupView group = checkMemberAndApproved(groupId, userId);

        ShowcaseEntry entry = entryRepo.findByGroupId(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Create the showcase entry's text fields before uploading a photo"));

        long existingCount = photoRepo.countByEntryId(entry.getId());
        if (existingCount >= MAX_PHOTOS_PER_ENTRY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Maximum " + MAX_PHOTOS_PER_ENTRY + " photos per showcase entry — remove one before adding another");
        }

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file uploaded");
        }
        String extension = ALLOWED_CONTENT_TYPES.get(file.getContentType());
        if (extension == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Unsupported image type. Allowed: jpeg, png, webp");
        }

        String filename = UUID.randomUUID() + extension;
        try {
            Files.write(uploadDir.resolve(filename), file.getBytes());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save photo");
        }

        ShowcasePhoto photo = new ShowcasePhoto();
        photo.setEntryId(entry.getId());
        photo.setPhotoPath(filename);
        photo.setPosition((int) existingCount);
        photoRepo.save(photo);

        return toResponse(entry, group);
    }

    // Swaps the given photo into position 0 (the gallery/detail-screen cover),
    // demoting whatever was previously first to the position it vacates —
    // non-destructive, unlike delete-then-re-add.
    @Transactional
    public ShowcaseEntryResponse setCoverPhoto(UUID groupId, UUID userId, UUID photoId) {
        GroupView group = checkMemberAndApproved(groupId, userId);

        ShowcaseEntry entry = entryRepo.findByGroupId(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No showcase entry for this group"));

        ShowcasePhoto target = photoRepo.findById(photoId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found"));
        if (!target.getEntryId().equals(entry.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found");
        }

        int targetPosition = target.getPosition();
        if (targetPosition != 0) {
            photoRepo.findByEntryIdOrderByPositionAsc(entry.getId()).stream()
                .filter(p -> p.getPosition() == 0)
                .findFirst()
                .ifPresent(currentCover -> {
                    currentCover.setPosition(targetPosition);
                    photoRepo.save(currentCover);
                });
            target.setPosition(0);
            photoRepo.save(target);
        }

        return toResponse(entry, group);
    }

    @Transactional
    public ShowcaseEntryResponse deletePhoto(UUID groupId, UUID userId, UUID photoId) {
        GroupView group = checkMemberAndApproved(groupId, userId);

        ShowcaseEntry entry = entryRepo.findByGroupId(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No showcase entry for this group"));

        ShowcasePhoto photo = photoRepo.findById(photoId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found"));
        if (!photo.getEntryId().equals(entry.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found");
        }

        photoRepo.delete(photo);
        deleteFileQuietly(photo.getPhotoPath());

        return toResponse(entry, group);
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

    public ShowcaseEntryResponse getEntry(UUID groupId) {
        ShowcaseEntry entry = entryRepo.findByGroupId(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No showcase entry for this group"));
        GroupView group = groupViewRepo.findById(groupId).orElse(null);
        return toResponse(entry, group);
    }

    // score/rank are null unless the entry's cohort has published its leaderboard —
    // showing a group's public rank before results are official would undercut the
    // point of publish/draft state.
    private record GroupScore(BigDecimal average, int rank) {}

    private Map<UUID, GroupScore> computeRanksForCohort(UUID cohortId) {
        CohortView cohort = cohortViewRepo.findById(cohortId).orElse(null);
        if (cohort == null || cohort.getLeaderboardPublishedAt() == null) {
            return Map.of();
        }

        List<GroupView> groups = groupViewRepo.findByCohortId(cohortId);
        if (groups.isEmpty()) return Map.of();

        Map<UUID, BigDecimal> weightByCriterion = criterionViewRepo.findByCohortId(cohortId).stream()
            .collect(Collectors.toMap(JudgingCriterionView::getId, JudgingCriterionView::getWeight));

        List<UUID> groupIds = groups.stream().map(GroupView::getId).toList();
        Map<UUID, List<ScorecardView>> scorecardsByGroup = scorecardViewRepo.findByGroupIdIn(groupIds).stream()
            .collect(Collectors.groupingBy(ScorecardView::getGroupId));

        record Scored(UUID groupId, BigDecimal average) {}
        List<Scored> scored = groups.stream()
            .map(g -> {
                List<ScorecardView> cards = scorecardsByGroup.getOrDefault(g.getId(), List.of());
                List<BigDecimal> sums = cards.stream().map(sc -> weightedSumOf(sc, weightByCriterion)).toList();
                BigDecimal average = sums.isEmpty() ? null : sums.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(sums.size()), 2, RoundingMode.HALF_UP);
                return new Scored(g.getId(), average);
            })
            .sorted(Comparator.comparing(Scored::average, Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();

        Map<UUID, GroupScore> ranks = new HashMap<>();
        int rank = 0;
        for (Scored s : scored) {
            if (s.average() == null) continue; // ungraded groups get no rank
            rank++;
            ranks.put(s.groupId(), new GroupScore(s.average(), rank));
        }
        return ranks;
    }

    // weighted sum = sum(score * weight / 100) across the scorecard's criteria — mirrors
    // JudgingService.weightedSumOf in judging-service exactly, since this is a read-only
    // view into the same tables and must agree with the real leaderboard.
    private BigDecimal weightedSumOf(ScorecardView scorecard, Map<UUID, BigDecimal> weightByCriterion) {
        return scorecard.getScores().stream()
            .map(score -> {
                BigDecimal weight = weightByCriterion.getOrDefault(score.getCriterionId(), BigDecimal.ZERO);
                return BigDecimal.valueOf(score.getScore())
                    .multiply(weight)
                    .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional
    public void deleteEntry(UUID groupId, UUID userId, String role) {
        if (!"admin".equals(role) && !memberRepo.existsByGroupIdAndUserId(groupId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this group");
        }
        ShowcaseEntry entry = entryRepo.findByGroupId(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No showcase entry for this group"));

        List<ShowcasePhoto> photos = photoRepo.findByEntryIdOrderByPositionAsc(entry.getId());
        // DB rows cascade-delete with the entry, but the files on disk don't —
        // grab the filenames first, then clean them up after.
        entryRepo.delete(entry);
        photos.forEach(p -> deleteFileQuietly(p.getPhotoPath()));
    }

    public List<ShowcaseEntryResponse> listEntries(UUID cohortId) {
        List<ShowcaseEntry> entries = cohortId != null
            ? entryRepo.findByCohortIdOrderByCreatedAtDesc(cohortId)
            : entryRepo.findAllByOrderByCreatedAtDesc();

        // Batch-fetch groups and photos for every entry in two queries total,
        // instead of two queries per entry — with a cohort's worth of entries
        // this turned one gallery load into dozens of sequential round-trips.
        List<UUID> groupIds = entries.stream().map(ShowcaseEntry::getGroupId).toList();
        Map<UUID, GroupView> groupsById = groupViewRepo.findAllById(groupIds).stream()
            .collect(Collectors.toMap(GroupView::getId, g -> g));

        List<UUID> entryIds = entries.stream().map(ShowcaseEntry::getId).toList();
        Map<UUID, List<ShowcasePhoto>> photosByEntry = photoRepo.findByEntryIdInOrderByPositionAsc(entryIds).stream()
            .collect(Collectors.groupingBy(ShowcasePhoto::getEntryId));

        Map<UUID, Map<UUID, GroupScore>> ranksByCohort = entries.stream()
            .map(ShowcaseEntry::getCohortId).distinct()
            .collect(Collectors.toMap(c -> c, this::computeRanksForCohort));

        return entries.stream()
            .map(e -> {
                GroupView group = groupsById.get(e.getGroupId());
                GroupScore score = ranksByCohort.getOrDefault(e.getCohortId(), Map.of()).get(e.getGroupId());
                return new ShowcaseEntryResponse(e,
                    group == null ? null : group.getGroupNumber(),
                    group == null ? null : group.getName(),
                    photosByEntry.getOrDefault(e.getId(), List.of()),
                    score == null ? null : score.average(),
                    score == null ? null : score.rank());
            })
            .toList();
    }

    private GroupView checkMemberAndApproved(UUID groupId, UUID userId) {
        if (!memberRepo.existsByGroupIdAndUserId(groupId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this group");
        }
        GroupView group = groupViewRepo.findById(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));

        ProposalView proposal = proposalViewRepo.findByGroupId(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "This group has no proposal yet"));
        if (proposal.getStatus() != ProposalStatus.approved) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "The group's proposal must be approved before publishing a showcase entry");
        }
        return group;
    }

    private void deleteFileQuietly(String filename) {
        try {
            Files.deleteIfExists(uploadDir.resolve(filename));
        } catch (IOException ignored) {
        }
    }

    private ShowcaseEntryResponse toResponse(ShowcaseEntry entry, GroupView group) {
        List<ShowcasePhoto> photos = photoRepo.findByEntryIdOrderByPositionAsc(entry.getId());
        GroupScore score = computeRanksForCohort(entry.getCohortId()).get(entry.getGroupId());
        return new ShowcaseEntryResponse(entry,
            group == null ? null : group.getGroupNumber(),
            group == null ? null : group.getName(),
            photos,
            score == null ? null : score.average(),
            score == null ? null : score.rank());
    }
}
