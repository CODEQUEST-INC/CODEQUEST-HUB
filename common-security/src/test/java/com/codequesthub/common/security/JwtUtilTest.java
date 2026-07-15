package com.codequesthub.common.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtUtilTest {

    private static final String SECRET = "test-secret-key-at-least-32-characters-long!!";
    private final JwtUtil jwtUtil = new JwtUtil(SECRET, 60_000);

    @Test
    void generateToken_roundTripsClaims() {
        String token = jwtUtil.generateToken("user-123", "jeremy@knust.edu.gh", "student");

        Claims claims = jwtUtil.parseToken(token);

        assertThat(claims.getSubject()).isEqualTo("user-123");
        assertThat(claims.get("email", String.class)).isEqualTo("jeremy@knust.edu.gh");
        assertThat(claims.get("role", String.class)).isEqualTo("student");
    }

    @Test
    void isValid_trueForFreshlyGeneratedToken() {
        String token = jwtUtil.generateToken("user-123", "jeremy@knust.edu.gh", "student");
        assertThat(jwtUtil.isValid(token)).isTrue();
    }

    @Test
    void isValid_falseForGarbage() {
        assertThat(jwtUtil.isValid("not-a-real-token")).isFalse();
    }

    @Test
    void isValid_falseForTokenSignedWithDifferentKey() {
        JwtUtil otherJwtUtil = new JwtUtil("a-completely-different-secret-key-32-chars", 60_000);
        String token = otherJwtUtil.generateToken("user-123", "jeremy@knust.edu.gh", "student");

        assertThat(jwtUtil.isValid(token)).isFalse();
    }
}
