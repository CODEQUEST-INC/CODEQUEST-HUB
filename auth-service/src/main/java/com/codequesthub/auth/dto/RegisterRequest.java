package com.codequesthub.auth.dto;

import com.codequesthub.auth.entity.UserRole;
import jakarta.validation.constraints.*;

public class RegisterRequest {
    @NotBlank @Size(min = 2, max = 150)
    private String fullName;

    @NotBlank @Email
    private String email;

    @NotBlank @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    private UserRole role = UserRole.student;
    private String studentId;
    private String indexNumber;

    public String getFullName() { return fullName; }
    public void setFullName(String v) { this.fullName = v; }
    public String getEmail() { return email; }
    public void setEmail(String v) { this.email = v; }
    public String getPassword() { return password; }
    public void setPassword(String v) { this.password = v; }
    public UserRole getRole() { return role; }
    public void setRole(UserRole v) { this.role = v; }
    public String getStudentId() { return studentId; }
    public void setStudentId(String v) { this.studentId = v; }
    public String getIndexNumber() { return indexNumber; }
    public void setIndexNumber(String v) { this.indexNumber = v; }
}
