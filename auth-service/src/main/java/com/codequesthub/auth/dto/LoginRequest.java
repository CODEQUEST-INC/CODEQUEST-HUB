package com.codequesthub.auth.dto;

import jakarta.validation.constraints.*;

public class LoginRequest {
    @NotBlank @Email
    private String email;

    @NotBlank
    private String password;

    public String getEmail() { return email; }
    public void setEmail(String v) { this.email = v; }
    public String getPassword() { return password; }
    public void setPassword(String v) { this.password = v; }
}
