package com.codequesthub.auth.service;

import com.codequesthub.auth.dto.RegisterRequest;
import com.codequesthub.auth.dto.UserSearchResult;
import com.codequesthub.auth.dto.UserSummaryResponse;
import com.codequesthub.auth.entity.User;
import com.codequesthub.auth.entity.UserRole;
import com.codequesthub.auth.repository.CohortViewRepository;
import com.codequesthub.auth.repository.GroupMemberViewRepository;
import com.codequesthub.auth.repository.GroupViewRepository;
import com.codequesthub.auth.repository.JudgeViewRepository;
import com.codequesthub.auth.repository.NotificationRepository;
import com.codequesthub.auth.repository.PaymentRecordViewRepository;
import com.codequesthub.auth.repository.ProposalVersionViewRepository;
import com.codequesthub.auth.repository.ProposalViewRepository;
import com.codequesthub.auth.repository.ScorecardViewRepository;
import com.codequesthub.auth.repository.ShowcaseEntryViewRepository;
import com.codequesthub.auth.repository.TaskViewRepository;
import com.codequesthub.auth.repository.UserRepository;
import com.codequesthub.common.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepo;
    @Mock private CohortViewRepository cohortViewRepo;
    @Mock private GroupMemberViewRepository groupMemberViewRepo;
    @Mock private GroupViewRepository groupViewRepo;
    @Mock private ProposalViewRepository proposalViewRepo;
    @Mock private ProposalVersionViewRepository proposalVersionViewRepo;
    @Mock private TaskViewRepository taskViewRepo;
    @Mock private ShowcaseEntryViewRepository showcaseEntryViewRepo;
    @Mock private JudgeViewRepository judgeViewRepo;
    @Mock private ScorecardViewRepository scorecardViewRepo;
    @Mock private PaymentRecordViewRepository paymentRecordViewRepo;
    @Mock private NotificationRepository notificationRepo;
    @Mock private PasswordEncoder encoder;
    @Mock private LoginRateLimiter rateLimiter;
    @Mock private EmailService emailService;

    // encoder/jwtUtil aren't exercised by lookupUsers(), and JwtUtil is a concrete
    // class that Mockito's inline mock maker can't instrument on newer JDKs
    // (Byte Buddy support lag) — passing null is fine since these tests never touch it.
    private AuthService authService() {
        return new AuthService(userRepo, cohortViewRepo, groupMemberViewRepo, groupViewRepo, proposalViewRepo,
            proposalVersionViewRepo, taskViewRepo, showcaseEntryViewRepo, judgeViewRepo, scorecardViewRepo,
            paymentRecordViewRepo, notificationRepo, null, null, rateLimiter, emailService);
    }

    // register() calls encoder.encode() and jwtUtil.generateToken() — a real
    // JwtUtil sidesteps the same Byte Buddy limitation since it's constructed
    // directly rather than mocked.
    private AuthService authServiceForRegister() {
        return new AuthService(userRepo, cohortViewRepo, groupMemberViewRepo, groupViewRepo, proposalViewRepo,
            proposalVersionViewRepo, taskViewRepo, showcaseEntryViewRepo, judgeViewRepo, scorecardViewRepo,
            paymentRecordViewRepo, notificationRepo, encoder, new JwtUtil("test-secret-key-32-characters-min", 3600000),
            rateLimiter, emailService);
    }

    private User userWith(UUID id, String fullName) {
        User u = new User();
        ReflectionTestUtils.setField(u, "id", id);
        u.setFullName(fullName);
        u.setEmail(fullName.toLowerCase().replace(" ", ".") + "@example.test");
        u.setRole(UserRole.student);
        return u;
    }

    @Test
    void lookupUsers_returnsIdAndFullNameForEachMatchedUser() {
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        when(userRepo.findAllById(List.of(id1, id2)))
            .thenReturn(List.of(userWith(id1, "Ama Boateng"), userWith(id2, "Kwame Mensah")));

        List<UserSummaryResponse> result = authService().lookupUsers(List.of(id1, id2));

        assertThat(result).hasSize(2);
        assertThat(result).extracting(UserSummaryResponse::getId).containsExactlyInAnyOrder(id1, id2);
        assertThat(result).extracting(UserSummaryResponse::getFullName)
            .containsExactlyInAnyOrder("Ama Boateng", "Kwame Mensah");
    }

    @Test
    void lookupUsers_silentlyOmitsIdsThatDontExist() {
        UUID knownId = UUID.randomUUID();
        UUID unknownId = UUID.randomUUID();
        when(userRepo.findAllById(List.of(knownId, unknownId)))
            .thenReturn(List.of(userWith(knownId, "Ama Boateng")));

        List<UserSummaryResponse> result = authService().lookupUsers(List.of(knownId, unknownId));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(knownId);
    }

    @Test
    void lookupUsers_returnsEmptyListForNoMatches() {
        when(userRepo.findAllById(List.of())).thenReturn(List.of());

        List<UserSummaryResponse> result = authService().lookupUsers(List.of());

        assertThat(result).isEmpty();
    }

    @Test
    void searchUsers_returnsEmptyForQueriesUnderTwoChars() {
        List<UserSearchResult> result = authService().searchUsers("a", null);

        assertThat(result).isEmpty();
        verify(userRepo, never()).search(any(), any());
        verify(userRepo, never()).searchByRole(any(), any(), any());
    }

    @Test
    void searchUsers_withoutRoleFilter_callsPlainSearch() {
        UUID id = UUID.randomUUID();
        when(userRepo.search(eq("ama"), any(Pageable.class))).thenReturn(List.of(userWith(id, "Ama Boateng")));

        List<UserSearchResult> result = authService().searchUsers("ama", null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(id);
        assertThat(result.get(0).getRole()).isEqualTo("student");
        verify(userRepo, never()).searchByRole(any(), any(), any());
    }

    @Test
    void searchUsers_withRoleFilter_callsSearchByRole() {
        UUID id = UUID.randomUUID();
        when(userRepo.searchByRole(eq("ama"), eq(UserRole.supervisor), any(Pageable.class)))
            .thenReturn(List.of(userWith(id, "Ama Boateng")));

        List<UserSearchResult> result = authService().searchUsers("ama", UserRole.supervisor);

        assertThat(result).hasSize(1);
        verify(userRepo, never()).search(any(), any());
    }

    private RegisterRequest studentRegisterReq(String indexNumber, String studentId, UUID cohortId) {
        RegisterRequest req = new RegisterRequest();
        req.setFullName("New Student");
        req.setEmail("new.student@example.test");
        req.setPassword("password123");
        req.setRole(UserRole.student);
        req.setIndexNumber(indexNumber);
        req.setStudentId(studentId);
        req.setCohortId(cohortId);
        return req;
    }

    @Test
    void register_studentMissingIndexNumber_badRequest() {
        UUID cohortId = UUID.randomUUID();
        when(userRepo.existsByEmail(any())).thenReturn(false);

        assertThatThrownBy(() -> authServiceForRegister().register(studentRegisterReq(null, "STU001", cohortId)))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Index number is required");
    }

    @Test
    void register_studentMissingStudentId_badRequest() {
        UUID cohortId = UUID.randomUUID();
        when(userRepo.existsByEmail(any())).thenReturn(false);

        assertThatThrownBy(() -> authServiceForRegister().register(studentRegisterReq("6143424", null, cohortId)))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Student ID is required");
    }

    @Test
    void register_studentMissingCohort_badRequest() {
        when(userRepo.existsByEmail(any())).thenReturn(false);

        assertThatThrownBy(() -> authServiceForRegister().register(studentRegisterReq("6143424", "STU001", null)))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("valid cohort is required");
    }

    @Test
    void register_studentUnknownCohort_badRequest() {
        UUID cohortId = UUID.randomUUID();
        when(userRepo.existsByEmail(any())).thenReturn(false);
        when(cohortViewRepo.existsById(cohortId)).thenReturn(false);

        assertThatThrownBy(() -> authServiceForRegister().register(studentRegisterReq("6143424", "STU001", cohortId)))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("valid cohort is required");
    }

    @Test
    void register_studentWithIndexNumberStudentIdAndCohort_succeeds() {
        UUID cohortId = UUID.randomUUID();
        when(userRepo.existsByEmail(any())).thenReturn(false);
        when(cohortViewRepo.existsById(cohortId)).thenReturn(true);
        when(encoder.encode(any())).thenReturn("hashed");
        when(userRepo.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            ReflectionTestUtils.setField(u, "id", UUID.randomUUID());
            ReflectionTestUtils.setField(u, "createdAt", java.time.OffsetDateTime.now());
            ReflectionTestUtils.setField(u, "updatedAt", java.time.OffsetDateTime.now());
            return u;
        });

        var result = authServiceForRegister().register(studentRegisterReq("6143424", "STU001", cohortId));

        assertThat(result.getUser().getIndexNumber()).isEqualTo("6143424");
        assertThat(result.getUser().getStudentId()).isEqualTo("STU001");
        assertThat(result.getUser().getCohortId()).isEqualTo(cohortId);
    }

    @Test
    void register_nonStudentRole_skipsIndexNumberAndCohortValidation() {
        when(userRepo.existsByEmail(any())).thenReturn(false);
        when(encoder.encode(any())).thenReturn("hashed");
        when(userRepo.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            ReflectionTestUtils.setField(u, "id", UUID.randomUUID());
            ReflectionTestUtils.setField(u, "createdAt", java.time.OffsetDateTime.now());
            ReflectionTestUtils.setField(u, "updatedAt", java.time.OffsetDateTime.now());
            return u;
        });

        RegisterRequest req = new RegisterRequest();
        req.setFullName("New Supervisor");
        req.setEmail("new.supervisor@example.test");
        req.setPassword("password123");
        req.setRole(UserRole.supervisor);

        var result = authServiceForRegister().register(req);

        assertThat(result.getUser().getRole()).isEqualTo("supervisor");
        verify(cohortViewRepo, never()).existsById(any());
    }

    @Test
    void deleteUser_userNotFound_notFound() {
        UUID id = UUID.randomUUID();
        when(userRepo.findById(id)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> authService().deleteUser(id, UUID.randomUUID()))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("not found");
    }

    @Test
    void deleteUser_selfDelete_badRequest() {
        UUID id = UUID.randomUUID();
        when(userRepo.findById(id)).thenReturn(java.util.Optional.of(userWith(id, "Self Deleter")));

        assertThatThrownBy(() -> authService().deleteUser(id, id))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("cannot delete your own account");
        verify(userRepo, never()).delete(any());
    }

    @Test
    void deleteUser_hasGroupMembership_conflictNamesBlocker() {
        UUID id = UUID.randomUUID();
        when(userRepo.findById(id)).thenReturn(java.util.Optional.of(userWith(id, "Group Member")));
        when(groupMemberViewRepo.existsByUserId(id)).thenReturn(true);

        assertThatThrownBy(() -> authService().deleteUser(id, UUID.randomUUID()))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("group membership");
        verify(userRepo, never()).delete(any());
    }

    @Test
    void deleteUser_hasPaymentRecords_conflictNamesBlocker() {
        UUID id = UUID.randomUUID();
        when(userRepo.findById(id)).thenReturn(java.util.Optional.of(userWith(id, "Payer")));
        when(paymentRecordViewRepo.existsByUserId(id)).thenReturn(true);

        assertThatThrownBy(() -> authService().deleteUser(id, UUID.randomUUID()))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("payment records");
        verify(userRepo, never()).delete(any());
    }

    @Test
    void deleteUser_noDependents_deletes() {
        UUID id = UUID.randomUUID();
        User user = userWith(id, "Clean Account");
        when(userRepo.findById(id)).thenReturn(java.util.Optional.of(user));

        authService().deleteUser(id, UUID.randomUUID());

        verify(userRepo).delete(user);
    }
}
