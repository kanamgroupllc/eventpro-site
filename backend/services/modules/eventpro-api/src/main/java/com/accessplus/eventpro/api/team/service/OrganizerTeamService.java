package com.accessplus.eventpro.api.team.service;

import com.accessplus.eventpro.api.dto.TeamMemberResponse;
import com.accessplus.eventpro.api.team.entity.OrganizerTeamMemberEntity;
import com.accessplus.eventpro.api.team.repository.OrganizerTeamMemberRepository;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrganizerTeamService {

    private static final Set<String> VALID_ROLES = Set.of("ADMIN", "EDITOR", "VIEWER");

    private final OrganizerTeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    /**
     * Organizer IDs the user can manage: themselves (as owner) plus any organizer for whom they are a team member.
     */
    public Set<UUID> getOrganizerIdsAccessibleByUser(UUID userId) {
        Set<UUID> ids = new HashSet<>();
        ids.add(userId);
        List<UUID> teamOrgs = teamMemberRepository.findOrganizerIdsByMemberUserId(userId);
        ids.addAll(teamOrgs);
        return ids;
    }

    public boolean canManageEvent(UUID userId, UUID eventOrganizerId) {
        if (userId.equals(eventOrganizerId)) {
            return true;
        }
        return teamMemberRepository.existsByOrganizerIdAndUserId(eventOrganizerId, userId);
    }

    public List<TeamMemberResponse> listMembers(UUID organizerId) {
        List<OrganizerTeamMemberEntity> members = teamMemberRepository.findByOrganizerIdOrderByCreatedAtAsc(organizerId);
        List<TeamMemberResponse> result = new ArrayList<>();
        for (OrganizerTeamMemberEntity m : members) {
            UserEntity user = userRepository.findById(m.getUserId()).orElse(null);
            result.add(TeamMemberResponse.builder()
                    .id(m.getId())
                    .userId(m.getUserId())
                    .email(user != null ? user.getEmail() : null)
                    .firstName(user != null ? user.getFirstName() : null)
                    .lastName(user != null ? user.getLastName() : null)
                    .role(m.getRole())
                    .joinedAt(m.getCreatedAt())
                    .build());
        }
        return result;
    }

    @Transactional
    public TeamMemberResponse addMember(UUID organizerId, String email, String role) {
        if (role == null || !VALID_ROLES.contains(role.toUpperCase())) {
            throw new ValidationException("Role must be ADMIN, EDITOR, or VIEWER");
        }
        UserEntity invitee = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email " + email));
        if (invitee.getId().equals(organizerId)) {
            throw new ValidationException("You cannot add yourself as a team member");
        }
        if (teamMemberRepository.existsByOrganizerIdAndUserId(organizerId, invitee.getId())) {
            throw new ValidationException("This user is already a team member");
        }
        OrganizerTeamMemberEntity entity = new OrganizerTeamMemberEntity();
        entity.setOrganizerId(organizerId);
        entity.setUserId(invitee.getId());
        entity.setRole(role.toUpperCase());
        entity = teamMemberRepository.save(entity);
        return TeamMemberResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .email(invitee.getEmail())
                .firstName(invitee.getFirstName())
                .lastName(invitee.getLastName())
                .role(entity.getRole())
                .joinedAt(entity.getCreatedAt())
                .build();
    }

    @Transactional
    public void removeMember(UUID organizerId, UUID userId) {
        if (!teamMemberRepository.existsByOrganizerIdAndUserId(organizerId, userId)) {
            throw new ResourceNotFoundException("Team member", userId.toString());
        }
        teamMemberRepository.deleteByOrganizerIdAndUserId(organizerId, userId);
        log.info("Removed team member userId={} from organizerId={}", userId, organizerId);
    }

    @Transactional
    public TeamMemberResponse updateMemberRole(UUID organizerId, UUID userId, String role) {
        if (role == null || !VALID_ROLES.contains(role.toUpperCase())) {
            throw new ValidationException("Role must be ADMIN, EDITOR, or VIEWER");
        }
        OrganizerTeamMemberEntity entity = teamMemberRepository.findByOrganizerIdAndUserId(organizerId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Team member", userId.toString()));
        entity.setRole(role.toUpperCase());
        entity = teamMemberRepository.save(entity);
        UserEntity user = userRepository.findById(userId).orElse(null);
        return TeamMemberResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .email(user != null ? user.getEmail() : null)
                .firstName(user != null ? user.getFirstName() : null)
                .lastName(user != null ? user.getLastName() : null)
                .role(entity.getRole())
                .joinedAt(entity.getCreatedAt())
                .build();
    }
}
