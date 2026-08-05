package com.codequesthub.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ResetPasswordRequest {
    @NotBlank @Email
    private String email;

    // The 6-digit code from the reset email — also embedded as a query param
    // in that email's deep link, so tapping the link and manual entry both
    // resolve to the same value.
    @NotBlank
    private String code;

    @NotBlank @Size(min = 8, max = 72, message = "Password must be 8-72 characters")
    private String newPassword;

    public String getEmail() { return email; }
    public void setEmail(String v) { this.email = v; }
    public String getCode() { return code; }
    public void setCode(String v) { this.code = v; }
    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String v) { this.newPassword = v; }
}
