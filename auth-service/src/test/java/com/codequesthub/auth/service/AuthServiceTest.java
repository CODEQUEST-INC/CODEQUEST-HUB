package com.codequesthub.auth.service;

import com.codequesthub.auth.dto.UserSummaryResponse;
import com.codequesthub.auth.entity.User;
import com.codequesthub.auth.entity.UserRole;
import com.codequesthub.auth.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepo;

    // encoder/jwtUtil aren't exercised by lookupUsers(), and JwtUtil is a concrete
    // class that Mockito's inline mock maker can't instrument on newer JDKs
    // (Byte Buddy support lag) — passing null is fine since these tests never touch it.
    private AuthService authService() {
        return new AuthService(userRepo, null, null);
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
}
