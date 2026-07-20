package com.codequesthub.payment.service;

import com.codequesthub.payment.dto.GroupPaymentStatus;
import com.codequesthub.payment.dto.InitializePaymentResponse;
import com.codequesthub.payment.entity.*;
import com.codequesthub.payment.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class PaymentService {

    private final PaymentFeeConfigRepository feeConfigRepo;
    private final PaymentRecordRepository recordRepo;
    private final GroupMemberRepository memberRepo;
    private final GroupViewRepository groupViewRepo;
    private final UserViewRepository userViewRepo;
    private final RestTemplate restTemplate;
    private final String paystackSecretKey;
    private final String paystackBaseUrl;

    public PaymentService(PaymentFeeConfigRepository feeConfigRepo,
                          PaymentRecordRepository recordRepo,
                          GroupMemberRepository memberRepo,
                          GroupViewRepository groupViewRepo,
                          UserViewRepository userViewRepo,
                          RestTemplate restTemplate,
                          @Value("${paystack.secret-key}") String paystackSecretKey,
                          @Value("${paystack.base-url}") String paystackBaseUrl) {
        this.feeConfigRepo = feeConfigRepo;
        this.recordRepo = recordRepo;
        this.memberRepo = memberRepo;
        this.groupViewRepo = groupViewRepo;
        this.userViewRepo = userViewRepo;
        this.restTemplate = restTemplate;
        this.paystackSecretKey = paystackSecretKey;
        this.paystackBaseUrl = paystackBaseUrl;
    }

    public PaymentFeeConfig getFeeConfig(UUID cohortId) {
        return feeConfigRepo.findByCohortId(cohortId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No fee configured for this cohort"));
    }

    @Transactional
    public PaymentFeeConfig setFeeConfig(UUID cohortId, int amountPesewas) {
        PaymentFeeConfig config = feeConfigRepo.findByCohortId(cohortId).orElseGet(PaymentFeeConfig::new);
        config.setCohortId(cohortId);
        config.setAmountPesewas(amountPesewas);
        return feeConfigRepo.save(config);
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public InitializePaymentResponse initializePayment(UUID userId, UUID groupId, String shirtSize) {
        if (!memberRepo.existsByGroupIdAndUserId(groupId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this group");
        }
        GroupView group = groupViewRepo.findById(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
        PaymentFeeConfig config = getFeeConfig(group.getCohortId());
        UserView user = userViewRepo.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        long memberCount = memberRepo.countByGroupId(groupId);
        int amount = config.getAmountPesewas() * (int) memberCount;
        String reference = UUID.randomUUID().toString();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(paystackSecretKey);
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, Object> paystackRequest = Map.of(
            "amount", amount,
            "email", user.getEmail(),
            "reference", reference,
            "currency", config.getCurrency()
        );

        ResponseEntity<Map> response;
        try {
            response = restTemplate.exchange(paystackBaseUrl + "/transaction/initialize", HttpMethod.POST,
                new HttpEntity<>(paystackRequest, headers), Map.class);
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not reach Paystack");
        }

        Map<String, Object> body = response.getBody();
        if (body == null || !Boolean.TRUE.equals(body.get("status"))) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Paystack rejected the initialize request");
        }
        Map<String, Object> data = (Map<String, Object>) body.get("data");
        String authorizationUrl = (String) data.get("authorization_url");

        PaymentRecord record = new PaymentRecord();
        record.setGroupId(groupId);
        record.setAmountPesewas(amount);
        record.setCurrency(config.getCurrency());
        record.setShirtSize(shirtSize);
        record.setPaystackReference(reference);
        record.setStatus(PaymentStatus.pending);
        recordRepo.save(record);

        return new InitializePaymentResponse(authorizationUrl, reference);
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public PaymentRecord verifyPayment(String reference) {
        PaymentRecord record = recordRepo.findByPaystackReference(reference)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment record not found"));

        if (record.getStatus() == PaymentStatus.success) {
            return record;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(paystackSecretKey);

        ResponseEntity<Map> response;
        try {
            response = restTemplate.exchange(paystackBaseUrl + "/transaction/verify/" + reference, HttpMethod.GET,
                new HttpEntity<>(headers), Map.class);
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not reach Paystack");
        }

        Map<String, Object> body = response.getBody();
        Map<String, Object> data = body != null ? (Map<String, Object>) body.get("data") : null;
        String paystackStatus = data != null ? (String) data.get("status") : null;

        if ("success".equals(paystackStatus)) {
            record.setStatus(PaymentStatus.success);
            record.setPaidAt(OffsetDateTime.now());
        } else {
            record.setStatus(PaymentStatus.failed);
        }
        return recordRepo.save(record);
    }

    public Optional<PaymentRecord> getGroupPaymentStatus(UUID groupId, UUID userId, String role) {
        checkCanView(groupId, userId, role);
        return recordRepo.findTopByGroupIdOrderByCreatedAtDesc(groupId);
    }

    public List<GroupPaymentStatus> getCohortPaymentStatuses(UUID cohortId) {
        List<GroupView> groups = groupViewRepo.findByCohortId(cohortId);
        return groups.stream()
            .map(g -> {
                Optional<PaymentRecord> record = recordRepo.findTopByGroupIdOrderByCreatedAtDesc(g.getId());
                String status = record.map(r -> r.getStatus().name()).orElse("unpaid");
                Integer amount = record.map(PaymentRecord::getAmountPesewas).orElse(null);
                return new GroupPaymentStatus(g.getId(), g.getGroupNumber(), g.getName(), status, amount);
            })
            .toList();
    }

    private void checkCanView(UUID groupId, UUID userId, String role) {
        if ("admin".equals(role)) return;

        GroupView group = groupViewRepo.findById(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));

        if ("supervisor".equals(role)) {
            if (!userId.equals(group.getSupervisorId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You are not the assigned supervisor for this group");
            }
            return;
        }

        if (!memberRepo.existsByGroupIdAndUserId(groupId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this group");
        }
    }
}
