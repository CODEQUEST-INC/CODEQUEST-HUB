package com.codequesthub.auth.dto;

public class AuthResponse {
    private UserResponse user;
    private String token;

    public AuthResponse(UserResponse user, String token) {
        this.user = user;
        this.token = token;
    }

    public UserResponse getUser() { return user; }
    public String getToken() { return token; }
}
