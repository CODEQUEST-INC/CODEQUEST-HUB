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
