package com.codequesthub.auth.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

// In-memory, per-email sliding-window limiter on login attempts — this app
// runs one instance per service (Docker Compose, not horizontally scaled),
// so there's no need for a shared store like Redis. Keyed by email rather
// than IP so students behind the same NAT/campus WiFi don't lock each other
// out; a compromised/guessed email still only gets a handful of tries.
@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_MILLIS = 15 * 60 * 1000L;

    private final Map<String, Deque<Instant>> attemptsByEmail = new ConcurrentHashMap<>();

    public void checkAllowed(String email) {
        Deque<Instant> attempts = attemptsByEmail.computeIfAbsent(normalize(email), k -> new ConcurrentLinkedDeque<>());
        Instant cutoff = Instant.now().minusMillis(WINDOW_MILLIS);
        synchronized (attempts) {
            while (!attempts.isEmpty() && attempts.peekFirst().isBefore(cutoff)) {
                attempts.pollFirst();
            }
            if (attempts.size() >= MAX_ATTEMPTS) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many login attempts for this account. Try again in a few minutes.");
            }
        }
    }

    public void recordFailedAttempt(String email) {
        attemptsByEmail.computeIfAbsent(normalize(email), k -> new ConcurrentLinkedDeque<>()).addLast(Instant.now());
    }

    public void recordSuccess(String email) {
        attemptsByEmail.remove(normalize(email));
    }

    private String normalize(String email) {
        return email.trim().toLowerCase();
    }
}
