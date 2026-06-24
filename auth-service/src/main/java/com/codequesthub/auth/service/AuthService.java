package com.codequesthub.auth.service;

import com.codequesthub.auth.dto.*;
import com.codequesthub.auth.entity.User;
import com.codequesthub.auth.repository.UserRepository;
import com.codequesthub.common.security.JwtUtil;
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
}
