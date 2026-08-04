package com.codequesthub.auth.controller;

import com.codequesthub.auth.dto.*;
import com.codequesthub.common.security.JwtUtil;
import com.codequesthub.auth.service.AuthService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;

    public AuthController(AuthService authService, JwtUtil jwtUtil) {
        this.authService = authService;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "service", "auth-service"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        AuthResponse resp = authService.register(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", resp));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        AuthResponse resp = authService.login(req);
        return ResponseEntity.ok(Map.of("data", resp));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader("Authorization") String authHeader) {
        if (!requireValidToken(authHeader)) {
            return unauthorized(authHeader);
        }
        Claims claims = jwtUtil.parseToken(authHeader.substring(7));
        UserResponse user = authService.me(claims.getSubject());
        return ResponseEntity.ok(Map.of("data", user));
    }

    // Any authenticated user — bulk id-to-name lookup, e.g. "Group 129" rendering
    // member names instead of raw UUIDs. Deliberately returns only id+fullName.
    @GetMapping("/users")
    public ResponseEntity<?> lookupUsers(@RequestParam java.util.List<java.util.UUID> ids,
                                         @RequestHeader("Authorization") String authHeader) {
        if (!requireValidToken(authHeader)) {
            return unauthorized(authHeader);
        }
        return ResponseEntity.ok(Map.of("data", authService.lookupUsers(ids)));
    }

    // Admin-only — every caller of this (assign judge/member/supervisor) is an
    // admin-gated action, and unlike /users (bulk lookup by already-known IDs)
    // this lets a caller enumerate the directory by typing letters.
    @GetMapping("/users/search")
    public ResponseEntity<?> searchUsers(@RequestParam String q,
                                         @RequestParam(required = false) String role,
                                         @RequestHeader("Authorization") String authHeader) {
        if (!requireValidToken(authHeader)) {
            return unauthorized(authHeader);
        }
        Claims claims = jwtUtil.parseToken(authHeader.substring(7));
        if (!"admin".equals(claims.get("role", String.class))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "forbidden", "message", "Admin access required"));
        }
        com.codequesthub.auth.entity.UserRole roleFilter = null;
        if (role != null && !role.isBlank()) {
            try {
                roleFilter = com.codequesthub.auth.entity.UserRole.valueOf(role);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "bad_request", "message", "Unknown role: " + role));
            }
        }
        return ResponseEntity.ok(Map.of("data", authService.searchUsers(q, roleFilter)));
    }

    // Admin-only — headline counts for the admin Users screen.
    @GetMapping("/users/stats")
    public ResponseEntity<?> usersStats(@RequestHeader("Authorization") String authHeader) {
        if (!requireValidToken(authHeader)) {
            return unauthorized(authHeader);
        }
        Claims claims = jwtUtil.parseToken(authHeader.substring(7));
        if (!"admin".equals(claims.get("role", String.class))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "forbidden", "message", "Admin access required"));
        }
        return ResponseEntity.ok(Map.of("data", authService.getUsersStats()));
    }

    // Admin-only — deletes an account outright. Blocks (409) rather than
    // cascading if the user has any real activity anywhere in the app; see
    // AuthService.deleteUser for the full rationale.
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable java.util.UUID id,
                                         @RequestHeader("Authorization") String authHeader) {
        if (!requireValidToken(authHeader)) {
            return unauthorized(authHeader);
        }
        Claims claims = jwtUtil.parseToken(authHeader.substring(7));
        if (!"admin".equals(claims.get("role", String.class))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "forbidden", "message", "Admin access required"));
        }
        java.util.UUID callerId = java.util.UUID.fromString(claims.getSubject());
        authService.deleteUser(id, callerId);
        return ResponseEntity.noContent().build();
    }

    // any authenticated user — requires the current password
    @PatchMapping("/me/password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest req,
                                             @RequestHeader("Authorization") String authHeader) {
        if (!requireValidToken(authHeader)) {
            return unauthorized(authHeader);
        }
        Claims claims = jwtUtil.parseToken(authHeader.substring(7));
        java.util.UUID userId = java.util.UUID.fromString(claims.getSubject());
        authService.changePassword(userId, req);
        return ResponseEntity.noContent().build();
    }

    // public — always responds the same way regardless of whether the email
    // exists, so this can't be used to enumerate registered accounts
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        authService.forgotPassword(req.getEmail());
        return ResponseEntity.ok(Map.of("data",
            Map.of("message", "If that email is registered, a reset code has been sent.")));
    }

    // public — the reset code itself is the credential here
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req.getToken(), req.getNewPassword());
        return ResponseEntity.noContent().build();
    }

    // any authenticated user — verifies their own account only
    @PostMapping("/me/verify-email")
    public ResponseEntity<?> verifyEmail(@Valid @RequestBody VerifyEmailRequest req,
                                          @RequestHeader("Authorization") String authHeader) {
        if (!requireValidToken(authHeader)) {
            return unauthorized(authHeader);
        }
        Claims claims = jwtUtil.parseToken(authHeader.substring(7));
        java.util.UUID userId = java.util.UUID.fromString(claims.getSubject());
        authService.verifyEmail(userId, req.getCode());
        return ResponseEntity.noContent().build();
    }

    // any authenticated user — resends to their own registered email only
    @PostMapping("/me/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestHeader("Authorization") String authHeader) {
        if (!requireValidToken(authHeader)) {
            return unauthorized(authHeader);
        }
        Claims claims = jwtUtil.parseToken(authHeader.substring(7));
        java.util.UUID userId = java.util.UUID.fromString(claims.getSubject());
        authService.resendVerification(userId);
        return ResponseEntity.noContent().build();
    }

    // any authenticated user — their own notifications only
    @GetMapping("/notifications/mine")
    public ResponseEntity<?> myNotifications(@RequestHeader("Authorization") String authHeader) {
        if (!requireValidToken(authHeader)) {
            return unauthorized(authHeader);
        }
        Claims claims = jwtUtil.parseToken(authHeader.substring(7));
        java.util.UUID userId = java.util.UUID.fromString(claims.getSubject());
        return ResponseEntity.ok(Map.of("data", authService.listMyNotifications(userId)));
    }

    // any authenticated user — must own the notification being marked read
    @PatchMapping("/notifications/{id}/read")
    public ResponseEntity<?> markNotificationRead(@PathVariable java.util.UUID id,
                                                   @RequestHeader("Authorization") String authHeader) {
        if (!requireValidToken(authHeader)) {
            return unauthorized(authHeader);
        }
        Claims claims = jwtUtil.parseToken(authHeader.substring(7));
        java.util.UUID userId = java.util.UUID.fromString(claims.getSubject());
        authService.markNotificationRead(id, userId);
        return ResponseEntity.noContent().build();
    }

    private boolean requireValidToken(String authHeader) {
        return authHeader != null && authHeader.startsWith("Bearer ") && jwtUtil.isValid(authHeader.substring(7));
    }

    private ResponseEntity<?> unauthorized(String authHeader) {
        String message = (authHeader == null || !authHeader.startsWith("Bearer "))
            ? "Missing Authorization header"
            : "Invalid or expired token";
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "unauthorized", "message", message));
    }
}
