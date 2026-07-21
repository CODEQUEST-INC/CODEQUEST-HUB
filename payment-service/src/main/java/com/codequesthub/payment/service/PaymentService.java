package com.codequesthub.payment.service;

import com.codequesthub.payment.dto.CohortGroupPaymentSummary;
import com.codequesthub.payment.dto.GroupPaymentSummary;
import com.codequesthub.payment.dto.InitializePaymentResponse;
import com.codequesthub.payment.dto.MemberPaymentStatus;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

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
        recordRepo.findTopByGroupIdAndUserIdOrderByCreatedAtDesc(groupId, userId)
            .filter(r -> r.getStatus() == PaymentStatus.success)
            .ifPresent(r -> {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You have already paid for this group");
            });

        GroupView group = groupViewRepo.findById(groupId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
        PaymentFeeConfig config = getFeeConfig(group.getCohortId());
        UserView user = userViewRepo.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // Each student pays their own flat fee — no more multiplying by member count.
        int amount = config.getAmountPesewas();
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
        record.setUserId(userId);
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

    // The calling student's own latest payment attempt for this group.
    public Optional<PaymentRecord> getMyPaymentStatus(UUID groupId, UUID userId) {
        if (!memberRepo.existsByGroupIdAndUserId(groupId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this group");
        }
        return recordRepo.findTopByGroupIdAndUserIdOrderByCreatedAtDesc(groupId, userId);
    }

    // Per-member breakdown for a single group — any member, the group's supervisor, or admin.
    public GroupPaymentSummary getGroupPaymentSummary(UUID groupId, UUID userId, String role) {
        checkCanView(groupId, userId, role);
        List<GroupMemberView> members = memberRepo.findByGroupId(groupId);
        Map<UUID, PaymentRecord> latestByUser = latestRecordByUser(recordRepo.findByGroupIdOrderByCreatedAtDesc(groupId));
        return buildSummary(groupId, members, latestByUser);
    }

    public List<CohortGroupPaymentSummary> getCohortPaymentStatuses(UUID cohortId) {
        List<GroupView> groups = groupViewRepo.findByCohortId(cohortId);
        List<UUID> groupIds = groups.stream().map(GroupView::getId).toList();

        // Batch-fetch members and payment records for every group in the cohort
        // in two queries total, instead of two queries per group — with a
        // cohort's worth of groups this turned one admin screen load into
        // dozens of sequential round-trips to Neon.
        Map<UUID, List<GroupMemberView>> membersByGroup = memberRepo.findByGroupIdIn(groupIds).stream()
            .collect(Collectors.groupingBy(GroupMemberView::getGroupId));

        Map<UUID, Map<UUID, PaymentRecord>> latestByGroupAndUser = new HashMap<>();
        for (PaymentRecord record : recordRepo.findByGroupIdInOrderByCreatedAtDesc(groupIds)) {
            latestByGroupAndUser
                .computeIfAbsent(record.getGroupId(), k -> new HashMap<>())
                .putIfAbsent(record.getUserId(), record);
        }

        return groups.stream()
            .map(g -> {
                List<GroupMemberView> members = membersByGroup.getOrDefault(g.getId(), List.of());
                Map<UUID, PaymentRecord> latestByUser = latestByGroupAndUser.getOrDefault(g.getId(), Map.of());
                GroupPaymentSummary summary = buildSummary(g.getId(), members, latestByUser);
                return new CohortGroupPaymentSummary(g.getId(), g.getGroupNumber(), g.getName(),
                    summary.getTotalMembers(), summary.getPaidCount(), summary.isAllPaid(), summary.getMembers());
            })
            .toList();
    }

    private Map<UUID, PaymentRecord> latestRecordByUser(List<PaymentRecord> recordsNewestFirst) {
        Map<UUID, PaymentRecord> latestByUser = new HashMap<>();
        for (PaymentRecord record : recordsNewestFirst) {
            latestByUser.putIfAbsent(record.getUserId(), record);
        }
        return latestByUser;
    }

    private GroupPaymentSummary buildSummary(UUID groupId, List<GroupMemberView> members,
                                              Map<UUID, PaymentRecord> latestByUser) {
        List<MemberPaymentStatus> memberStatuses = members.stream()
            .map(m -> {
                PaymentRecord record = latestByUser.get(m.getUserId());
                String status = record != null ? record.getStatus().name() : "unpaid";
                String shirtSize = record != null ? record.getShirtSize() : null;
                return new MemberPaymentStatus(m.getUserId(), status, shirtSize);
            })
            .toList();

        int paidCount = (int) memberStatuses.stream().filter(m -> "success".equals(m.getStatus())).count();
        boolean allPaid = !memberStatuses.isEmpty() && paidCount == memberStatuses.size();

        return new GroupPaymentSummary(groupId, memberStatuses.size(), paidCount, allPaid, memberStatuses);
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
