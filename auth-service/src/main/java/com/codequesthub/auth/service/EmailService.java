package com.codequesthub.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

// Stub — no SMTP credentials are configured yet. Logs what would have been sent
// so the reset flow is fully wired; swap this for a real JavaMailSender-backed
// implementation once credentials are available, without touching any caller.
// Mirrors payment-service's EmailService — each service keeps its own, no
// shared mail module exists in this codebase.
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    public void sendPasswordReset(String toEmail, String resetToken) {
        log.info("[stub email] to={} subject=Reset your password body=Your reset code is: {}", toEmail, resetToken);
    }
}
