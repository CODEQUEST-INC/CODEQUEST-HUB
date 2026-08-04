package com.codequesthub.payment.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

// Stub — no SMTP credentials are configured yet. Logs what would have been sent
// so the reminder flow is fully wired; swap this for a real JavaMailSender-backed
// implementation once credentials are available, without touching any caller.
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    public void sendPaymentReminder(String toEmail, String subject, String body) {
        log.info("[stub email] to={} subject={} body={}", toEmail, subject, body);
    }
}
