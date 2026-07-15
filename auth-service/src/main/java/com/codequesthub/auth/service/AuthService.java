package com.codequesthub.auth.service;

import com.codequesthub.auth.dto.*;
import com.codequesthub.auth.entity.User;
import com.codequesthub.auth.entity.UserRole;
import com.codequesthub.auth.repository.UserRepository;
import com.codequesthub.common.security.JwtUtil;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepo;
    private final PasswordEncoder encoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepo, PasswordEncoder encoder, JwtUtil jwtUtil) {
        this.userRepo = userRepo;
        this.encoder = encoder;
        this.jwtUtil = jwtUtil;
    }

    public AuthResponse register(RegisterRequest req) {
        if (userRepo.existsByEmail(req.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "An account with this email already exists");
        }

        User user = new User();
        user.setFullName(req.getFullName());
        user.setEmail(req.getEmail());
        user.setPasswordHash(encoder.encode(req.getPassword()));
        user.setRole(req.getRole() != null ? req.getRole() : com.codequesthub.auth.entity.UserRole.student);
        user.setStudentId(req.getStudentId());
        user.setIndexNumber(req.getIndexNumber());

        user = userRepo.save(user);

        String token = jwtUtil.generateToken(
            user.getId().toString(), user.getEmail(), user.getRole().name());

        return new AuthResponse(UserResponse.from(user), token);
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepo.findByEmail(req.getEmail())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Email or password is incorrect"));

        if (!encoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Email or password is incorrect");
        }

        String token = jwtUtil.generateToken(
            user.getId().toString(), user.getEmail(), user.getRole().name());

        return new AuthResponse(UserResponse.from(user), token);
    }

    public UserResponse me(String userId) {
        return userRepo.findById(java.util.UUID.fromString(userId))
            .map(UserResponse::from)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    // Minimal-disclosure bulk lookup (id + fullName only) so other services/clients
    // can resolve the user IDs they store (group members, task assignees, etc.)
    // to display names without exposing email/role/studentId.
    public java.util.List<UserSummaryResponse> lookupUsers(java.util.List<java.util.UUID> ids) {
        return userRepo.findAllById(ids).stream()
            .map(UserSummaryResponse::from)
            .toList();
    }

    // Backs an admin type-ahead picker (assign judge/member/supervisor by name
    // instead of pasting a UUID) — blank/short queries return nothing rather
    // than the whole directory.
    public java.util.List<UserSearchResult> searchUsers(String q, UserRole role) {
        if (q == null || q.trim().length() < 2) {
            return java.util.List.of();
        }
        String trimmed = q.trim();
        var page = PageRequest.of(0, 20);
        var results = role != null ? userRepo.searchByRole(trimmed, role, page) : userRepo.search(trimmed, page);
        return results.stream()
            .map(UserSearchResult::from)
            .toList();
    }
}
