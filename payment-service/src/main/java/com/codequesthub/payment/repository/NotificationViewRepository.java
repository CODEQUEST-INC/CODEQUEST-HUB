package com.codequesthub.payment.repository;

import com.codequesthub.payment.entity.NotificationView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface NotificationViewRepository extends JpaRepository<NotificationView, UUID> {}
