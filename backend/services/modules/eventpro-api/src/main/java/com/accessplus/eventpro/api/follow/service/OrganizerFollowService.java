package com.accessplus.eventpro.api.follow.service;

import com.accessplus.eventpro.api.dto.FollowedOrganizerResponse;
import com.accessplus.eventpro.api.follow.entity.OrganizerFollowEntity;
import com.accessplus.eventpro.api.follow.repository.OrganizerFollowRepository;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrganizerFollowService {

    private final OrganizerFollowRepository followRepository;
    private final UserRepository userRepository;

    @Transactional
    public void follow(UUID userId, UUID organizerId) {
        if (userId.equals(organizerId)) {
            throw new ValidationException("You cannot follow yourself.");
        }
        if (!userRepository.existsById(organizerId)) {
            throw new ResourceNotFoundException("Organizer", organizerId.toString());
        }
        if (followRepository.existsByUserIdAndOrganizerId(userId, organizerId)) {
            return; // already following
        }
        OrganizerFollowEntity follow = new OrganizerFollowEntity();
        follow.setUserId(userId);
        follow.setOrganizerId(organizerId);
        followRepository.save(follow);
        log.debug("User {} followed organizer {}", userId, organizerId);
    }

    @Transactional
    public void unfollow(UUID userId, UUID organizerId) {
        followRepository.findByUserIdAndOrganizerId(userId, organizerId)
                .ifPresent(followRepository::delete);
        log.debug("User {} unfollowed organizer {}", userId, organizerId);
    }

    public boolean isFollowing(UUID userId, UUID organizerId) {
        return followRepository.existsByUserIdAndOrganizerId(userId, organizerId);
    }

    public List<UUID> getFollowedOrganizerIds(UUID userId) {
        return followRepository.findOrganizerIdsByUserId(userId);
    }

    public List<OrganizerFollowEntity> getFollowsByUserId(UUID userId) {
        return followRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<FollowedOrganizerResponse> getFollowedOrganizersWithDetails(UUID userId) {
        List<OrganizerFollowEntity> follows = followRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (follows.isEmpty()) return List.of();
        List<UUID> organizerIds = follows.stream().map(OrganizerFollowEntity::getOrganizerId).distinct().toList();
        Map<UUID, UserEntity> users = userRepository.findAllById(organizerIds).stream().collect(Collectors.toMap(UserEntity::getId, u -> u));
        List<FollowedOrganizerResponse> result = new ArrayList<>();
        for (OrganizerFollowEntity f : follows) {
            UserEntity org = users.get(f.getOrganizerId());
            if (org == null) continue;
            result.add(FollowedOrganizerResponse.builder()
                    .organizerId(org.getId())
                    .firstName(org.getFirstName())
                    .lastName(org.getLastName())
                    .profilePictureUrl(org.getProfilePictureUrl())
                    .build());
        }
        return result;
    }
}
