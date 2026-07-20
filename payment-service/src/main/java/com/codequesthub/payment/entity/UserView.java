package com.codequesthub.payment.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "users")
public class UserView {
    @Id
    private UUID id;

    @Column(name = "email")
    private String email;

    public UUID getId() { return id; }
    public String getEmail() { return email; }
}
