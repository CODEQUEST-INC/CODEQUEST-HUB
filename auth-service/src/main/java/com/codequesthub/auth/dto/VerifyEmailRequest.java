package com.codequesthub.auth.dto;

import jakarta.validation.constraints.NotBlank;

public class VerifyEmailRequest {
    @NotBlank
    private String code;

    public String getCode() { return code; }
    public void setCode(String v) { this.code = v; }
}
