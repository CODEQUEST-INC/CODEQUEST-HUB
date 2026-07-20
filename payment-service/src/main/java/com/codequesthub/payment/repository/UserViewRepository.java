package com.codequesthub.payment.repository;

import com.codequesthub.payment.entity.UserView;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserViewRepository extends JpaRepository<UserView, UUID> {}
