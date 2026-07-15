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
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ShowcaseService {

    private static final Map<String, String> ALLOWED_CONTENT_TYPES = Map.of(
        "image/jpeg", ".jpg",
        "image/png", ".png",
        "image/webp", ".webp"
    );

    private final ShowcaseEntryRepository entryRepo;
    private final GroupViewRepository groupViewRepo;
    private final GroupMemberRepository memberRepo;
    private final ProposalViewRepository proposalViewRepo;
    private final Path uploadDir;

    public ShowcaseService(ShowcaseEntryRepository entryRepo,
                            GroupViewRepository groupViewRepo,
                            GroupMemberRepository memberRepo,
                            ProposalViewRepository proposalViewRepo,
                            @Value("${showcase.upload-dir}") String uploadDir) {
        this.entryRepo = entryRepo;
        this.groupViewRepo = groupViewRepo;
        this.memberRepo = memberRepo;
        this.proposalViewRepo = proposalViewRepo;
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
    public ShowcaseEntryResponse uploadPhoto(UUID groupId, UUID userId, MultipartFile file) {
        GroupView group = checkMemberAndApproved(groupId, userId);

        ShowcaseEntry entry = entryRepo.findByGroupId(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Create the showcase entry's text fields before uploading a photo"));

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file uploaded");
        }
        String extension = ALLOWED_CONTENT_TYPES.get(file.getContentType());
        if (extension == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Unsupported image type. Allowed: jpeg, png, webp");
        }

        String oldPhotoPath = entry.getPhotoPath();
        String filename = UUID.randomUUID() + extension;
        try {
            Files.write(uploadDir.resolve(filename), file.getBytes());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save photo");
        }

        entry.setPhotoPath(filename);
        ShowcaseEntry saved = entryRepo.save(entry);

        if (oldPhotoPath != null) {
            deleteFileQuietly(oldPhotoPath);
        }

        return toResponse(saved, group);
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

    @Transactional
    public void deleteEntry(UUID groupId, UUID userId, String role) {
        if (!"admin".equals(role) && !memberRepo.existsByGroupIdAndUserId(groupId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this group");
        }
        ShowcaseEntry entry = entryRepo.findByGroupId(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No showcase entry for this group"));
        entryRepo.delete(entry);
        if (entry.getPhotoPath() != null) {
            deleteFileQuietly(entry.getPhotoPath());
        }
    }

    public List<ShowcaseEntryResponse> listEntries(UUID cohortId) {
        List<ShowcaseEntry> entries = cohortId != null
            ? entryRepo.findByCohortIdOrderByCreatedAtDesc(cohortId)
            : entryRepo.findAllByOrderByCreatedAtDesc();

        return entries.stream()
            .map(e -> toResponse(e, groupViewRepo.findById(e.getGroupId()).orElse(null)))
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
        return new ShowcaseEntryResponse(entry,
            group == null ? null : group.getGroupNumber(),
            group == null ? null : group.getName());
    }
}
