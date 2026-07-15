package com.codequesthub.showcase.controller;

import com.codequesthub.showcase.dto.ShowcaseEntryResponse;
import com.codequesthub.showcase.dto.UpsertShowcaseRequest;
import com.codequesthub.showcase.service.ShowcaseService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/showcase")
public class ShowcaseController {

    private final ShowcaseService showcaseService;

    public ShowcaseController(ShowcaseService showcaseService) {
        this.showcaseService = showcaseService;
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "service", "showcase-service"));
    }

    // any group member — gated on the group's proposal being approved
    @PostMapping("/{groupId}")
    public ResponseEntity<?> upsertEntry(@PathVariable UUID groupId,
                                          @Valid @RequestBody UpsertShowcaseRequest req,
                                          Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        ShowcaseEntryResponse entry = showcaseService.upsertEntry(groupId, userId, req);
        return ResponseEntity.ok(Map.of("data", entry));
    }

    // any group member — entry must already exist
    @PostMapping(value = "/{groupId}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadPhoto(@PathVariable UUID groupId,
                                          @RequestParam("file") MultipartFile file,
                                          Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        ShowcaseEntryResponse entry = showcaseService.uploadPhoto(groupId, userId, file);
        return ResponseEntity.ok(Map.of("data", entry));
    }

    // a member of the group (take down their own entry) or an admin (moderation)
    @DeleteMapping("/{groupId}")
    public ResponseEntity<?> deleteEntry(@PathVariable UUID groupId, Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        Claims claims = (Claims) auth.getDetails();
        String role = claims.get("role", String.class);
        showcaseService.deleteEntry(groupId, userId, role);
        return ResponseEntity.noContent().build();
    }

    // public
    @GetMapping
    public ResponseEntity<?> listEntries(@RequestParam(required = false) UUID cohortId) {
        List<ShowcaseEntryResponse> entries = showcaseService.listEntries(cohortId);
        return ResponseEntity.ok(Map.of("data", entries));
    }

    // public
    @GetMapping("/{groupId}")
    public ResponseEntity<?> getEntry(@PathVariable UUID groupId) {
        ShowcaseEntryResponse entry = showcaseService.getEntry(groupId);
        return ResponseEntity.ok(Map.of("data", entry));
    }

    // public
    @GetMapping("/photos/{filename}")
    public ResponseEntity<byte[]> getPhoto(@PathVariable String filename) {
        byte[] bytes = showcaseService.readPhoto(filename);
        MediaType contentType = filename.endsWith(".png") ? MediaType.IMAGE_PNG
            : filename.endsWith(".webp") ? MediaType.valueOf("image/webp")
            : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, contentType.toString())
            .body(bytes);
    }
}
