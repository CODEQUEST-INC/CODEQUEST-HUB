package com.codequesthub.payment.service;

import com.codequesthub.payment.entity.*;
import com.codequesthub.payment.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock private PaymentFeeConfigRepository feeConfigRepo;
    @Mock private PaymentRecordRepository recordRepo;
    @Mock private GroupMemberRepository memberRepo;
    @Mock private GroupViewRepository groupViewRepo;
    @Mock private UserViewRepository userViewRepo;

    private RestTemplate restTemplate;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        restTemplate = new RestTemplate();
        mockServer = MockRestServiceServer.bindTo(restTemplate).build();
    }

    private PaymentService service() {
        return new PaymentService(feeConfigRepo, recordRepo, memberRepo, groupViewRepo, userViewRepo,
            restTemplate, "sk_test_secret", "https://api.paystack.co");
    }

    private GroupView groupWith(UUID id, UUID cohortId) {
        GroupView g = new GroupView();
        ReflectionTestUtils.setField(g, "id", id);
        ReflectionTestUtils.setField(g, "cohortId", cohortId);
        return g;
    }

    private PaymentFeeConfig feeConfigWith(UUID cohortId, int amountPesewas) {
        PaymentFeeConfig c = new PaymentFeeConfig();
        c.setCohortId(cohortId);
        c.setAmountPesewas(amountPesewas);
        return c;
    }

    private UserView userWith(UUID id, String email) {
        UserView u = new UserView();
        ReflectionTestUtils.setField(u, "id", id);
        ReflectionTestUtils.setField(u, "email", email);
        return u;
    }

    private PaymentRecord recordWith(String reference, PaymentStatus status) {
        PaymentRecord r = new PaymentRecord();
        r.setPaystackReference(reference);
        r.setStatus(status);
        r.setAmountPesewas(1000);
        r.setGroupId(UUID.randomUUID());
        return r;
    }

    @Test
    void initializePayment_nonMember_forbidden() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(false);

        assertThatThrownBy(() -> service().initializePayment(userId, groupId, "M"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("not a member");
    }

    @Test
    void initializePayment_amountIsFlatFeePerStudent_notMultipliedByGroupSize() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID cohortId = UUID.randomUUID();

        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(true);
        when(recordRepo.findTopByGroupIdAndUserIdOrderByCreatedAtDesc(groupId, userId)).thenReturn(Optional.empty());
        when(groupViewRepo.findById(groupId)).thenReturn(Optional.of(groupWith(groupId, cohortId)));
        when(feeConfigRepo.findByCohortId(cohortId)).thenReturn(Optional.of(feeConfigWith(cohortId, 5000)));
        when(userViewRepo.findById(userId)).thenReturn(Optional.of(userWith(userId, "student@example.com")));

        mockServer.expect(requestTo("https://api.paystack.co/transaction/initialize"))
            .andExpect(method(HttpMethod.POST))
            .andRespond(withSuccess(
                "{\"status\":true,\"data\":{\"authorization_url\":\"https://checkout.paystack.com/xyz\"}}",
                MediaType.APPLICATION_JSON));

        var result = service().initializePayment(userId, groupId, "L");

        assertThat(result.getAuthorizationUrl()).isEqualTo("https://checkout.paystack.com/xyz");
        mockServer.verify();
    }

    @Test
    void initializePayment_alreadyPaid_badRequest() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(true);
        when(recordRepo.findTopByGroupIdAndUserIdOrderByCreatedAtDesc(groupId, userId))
            .thenReturn(Optional.of(recordWith("ref-paid", PaymentStatus.success)));

        assertThatThrownBy(() -> service().initializePayment(userId, groupId, "M"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("already paid");
    }

    @Test
    void initializePayment_paystackUnreachable_badGateway() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID cohortId = UUID.randomUUID();

        when(memberRepo.existsByGroupIdAndUserId(groupId, userId)).thenReturn(true);
        when(recordRepo.findTopByGroupIdAndUserIdOrderByCreatedAtDesc(groupId, userId)).thenReturn(Optional.empty());
        when(groupViewRepo.findById(groupId)).thenReturn(Optional.of(groupWith(groupId, cohortId)));
        when(feeConfigRepo.findByCohortId(cohortId)).thenReturn(Optional.of(feeConfigWith(cohortId, 5000)));
        when(userViewRepo.findById(userId)).thenReturn(Optional.of(userWith(userId, "student@example.com")));

        mockServer.expect(requestTo("https://api.paystack.co/transaction/initialize"))
            .andRespond(request -> { throw new IOException("connect timed out"); });

        assertThatThrownBy(() -> service().initializePayment(userId, groupId, "M"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Could not reach Paystack");
    }

    @Test
    void verifyPayment_alreadySuccess_doesNotCallPaystackAgain() {
        PaymentRecord existing = recordWith("ref-123", PaymentStatus.success);
        when(recordRepo.findByPaystackReference("ref-123")).thenReturn(Optional.of(existing));

        PaymentRecord result = service().verifyPayment("ref-123");

        assertThat(result.getStatus()).isEqualTo(PaymentStatus.success);
        mockServer.verify(); // no requests expected or made
    }

    @Test
    void verifyPayment_paystackConfirmsSuccess_marksRecordSuccessWithPaidAt() {
        PaymentRecord pending = recordWith("ref-456", PaymentStatus.pending);
        when(recordRepo.findByPaystackReference("ref-456")).thenReturn(Optional.of(pending));
        when(recordRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        mockServer.expect(requestTo("https://api.paystack.co/transaction/verify/ref-456"))
            .andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess("{\"data\":{\"status\":\"success\"}}", MediaType.APPLICATION_JSON));

        PaymentRecord result = service().verifyPayment("ref-456");

        assertThat(result.getStatus()).isEqualTo(PaymentStatus.success);
        assertThat(result.getPaidAt()).isNotNull();
    }

    @Test
    void verifyPayment_paystackReportsFailed_marksRecordFailed() {
        PaymentRecord pending = recordWith("ref-789", PaymentStatus.pending);
        when(recordRepo.findByPaystackReference("ref-789")).thenReturn(Optional.of(pending));
        when(recordRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        mockServer.expect(requestTo("https://api.paystack.co/transaction/verify/ref-789"))
            .andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess("{\"data\":{\"status\":\"failed\"}}", MediaType.APPLICATION_JSON));

        PaymentRecord result = service().verifyPayment("ref-789");

        assertThat(result.getStatus()).isEqualTo(PaymentStatus.failed);
        assertThat(result.getPaidAt()).isNull();
    }

    @Test
    void getGroupPaymentSummary_supervisorOfDifferentGroup_forbidden() {
        UUID groupId = UUID.randomUUID();
        UUID supervisorId = UUID.randomUUID();
        UUID otherSupervisorId = UUID.randomUUID();
        GroupView group = groupWith(groupId, UUID.randomUUID());
        ReflectionTestUtils.setField(group, "supervisorId", otherSupervisorId);
        when(groupViewRepo.findById(groupId)).thenReturn(Optional.of(group));

        assertThatThrownBy(() -> service().getGroupPaymentSummary(groupId, supervisorId, "supervisor"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("not the assigned supervisor");
    }

    private GroupMemberView memberWith(UUID groupId, UUID userId) {
        GroupMemberView m = new GroupMemberView();
        ReflectionTestUtils.setField(m, "groupId", groupId);
        ReflectionTestUtils.setField(m, "userId", userId);
        return m;
    }

    private PaymentRecord recordFor(UUID groupId, UUID userId, PaymentStatus status, String shirtSize) {
        PaymentRecord r = recordWith(UUID.randomUUID().toString(), status);
        r.setGroupId(groupId);
        r.setUserId(userId);
        r.setShirtSize(shirtSize);
        return r;
    }

    @Test
    void getGroupPaymentSummary_allMembersPaid_allPaidTrue() {
        UUID groupId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        UUID m1 = UUID.randomUUID();
        UUID m2 = UUID.randomUUID();
        when(memberRepo.findByGroupId(groupId)).thenReturn(List.of(memberWith(groupId, m1), memberWith(groupId, m2)));
        when(recordRepo.findByGroupIdOrderByCreatedAtDesc(groupId)).thenReturn(List.of(
            recordFor(groupId, m1, PaymentStatus.success, "M"),
            recordFor(groupId, m2, PaymentStatus.success, "L")));

        var summary = service().getGroupPaymentSummary(groupId, adminId, "admin");

        assertThat(summary.getTotalMembers()).isEqualTo(2);
        assertThat(summary.getPaidCount()).isEqualTo(2);
        assertThat(summary.isAllPaid()).isTrue();
    }

    @Test
    void getGroupPaymentSummary_someMembersUnpaid_allPaidFalse() {
        UUID groupId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        UUID m1 = UUID.randomUUID();
        UUID m2 = UUID.randomUUID();
        when(memberRepo.findByGroupId(groupId)).thenReturn(List.of(memberWith(groupId, m1), memberWith(groupId, m2)));
        when(recordRepo.findByGroupIdOrderByCreatedAtDesc(groupId))
            .thenReturn(List.of(recordFor(groupId, m1, PaymentStatus.success, "M")));

        var summary = service().getGroupPaymentSummary(groupId, adminId, "admin");

        assertThat(summary.getPaidCount()).isEqualTo(1);
        assertThat(summary.isAllPaid()).isFalse();
        var m2Status = summary.getMembers().stream().filter(ms -> ms.getUserId().equals(m2)).findFirst().orElseThrow();
        assertThat(m2Status.getStatus()).isEqualTo("unpaid");
        assertThat(m2Status.getShirtSize()).isNull();
    }
}
