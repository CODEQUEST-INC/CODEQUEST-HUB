package com.codequesthub.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

// Sends through Brevo's SMTP relay via the JavaMailSender autoconfigured
// from spring.mail.* in application.properties (credentials come from
// SMTP_USERNAME/SMTP_PASSWORD). Mirrors payment-service's EmailService —
// each service keeps its own, no shared mail module exists in this codebase.
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String from;

    public EmailService(JavaMailSender mailSender, @Value("${mail.from}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    public void sendPasswordReset(String toEmail, String resetCode) {
        String encodedEmail = URLEncoder.encode(toEmail, StandardCharsets.UTF_8);
        String deepLink = "codequesthub://reset-password?email=" + encodedEmail + "&code=" + resetCode;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(toEmail);
        message.setSubject("Reset your password");
        message.setText(
            "Tap to reset your password on your device:\n" + deepLink + "\n\n"
            + "Or enter this code in the app manually: " + resetCode + "\n\n"
            + "This code expires in 15 minutes. If you didn't request this, you can ignore this email."
        );
        try {
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}", toEmail, e);
        }
    }

    public void sendVerificationEmail(String toEmail, String verificationCode) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(toEmail);
        message.setSubject("Verify your email");
        message.setText("Your verification code is: " + verificationCode);
        try {
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}", toEmail, e);
        }
    }
}
