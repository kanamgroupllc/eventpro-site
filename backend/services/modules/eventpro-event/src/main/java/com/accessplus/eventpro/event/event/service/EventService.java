package com.accessplus.eventpro.event.event.service;

import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.shared.enums.EventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

/**
 * Service interface for event management operations.
 * 
 * <p>Provides methods for:
 * <ul>
 *   <li>Creating events with image upload</li>
 *   <li>Updating event information</li>
 *   <li>Deleting events</li>
 *   <li>Retrieving events by ID, category, organizer</li>
 *   <li>Listing events with pagination</li>
 * </ul>
 */
public interface EventService {

    /**
     * Creates a new event with optional image upload.
     * 
     * @param event the event entity to create
     * @param organizerId the UUID of the user creating the event (organizer)
     * @param categoryId the UUID of the event category
     * @param imageFile optional image file to upload to S3
     * @return created EventEntity with image URL if image was uploaded
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if organizer or category not found
     * @throws IOException if image upload fails
     * @throws IllegalArgumentException if event validation fails
     */
    EventEntity createEvent(EventEntity event, UUID organizerId, UUID categoryId, MultipartFile imageFile) 
            throws IOException;

    /**
     * Updates an existing event.
     * 
     * @param eventId the UUID of the event to update
     * @param event the updated event data (only non-null fields will be updated)
     * @param categoryId optional category ID to update
     * @param imageFile optional new image file to upload
     * @return updated EventEntity
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if event, category, or organizer not found
     * @throws IOException if image upload fails
     * @throws IllegalArgumentException if validation fails
     */
    EventEntity updateEvent(UUID eventId, EventEntity event, UUID categoryId, MultipartFile imageFile) 
            throws IOException;

    /**
     * Deletes an event by ID.
     * 
     * @param eventId the UUID of the event to delete
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if event not found
     */
    void deleteEvent(UUID eventId);

    /**
     * Retrieves an event by ID.
     * 
     * @param eventId the UUID of the event
     * @return EventEntity if found
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if event not found
     */
    EventEntity getEventById(UUID eventId);

    /**
     * Retrieves all events with pagination.
     * 
     * @param pageable pagination and sorting parameters
     * @return Page of EventEntity
     */
    Page<EventEntity> getAllEvents(Pageable pageable);

    /**
     * Retrieves events by category with pagination.
     * 
     * @param categoryId the UUID of the category
     * @param pageable pagination and sorting parameters
     * @return Page of EventEntity in the category
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if category not found
     */
    Page<EventEntity> getEventsByCategory(UUID categoryId, Pageable pageable);

    /**
     * Retrieves events by organizer with pagination.
     * 
     * @param organizerId the UUID of the organizer (user)
     * @param pageable pagination and sorting parameters
     * @return Page of EventEntity created by the organizer
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if organizer not found
     */
    Page<EventEntity> getEventsByOrganizer(UUID organizerId, Pageable pageable);

    /**
     * Retrieves events by multiple organizers (e.g. for team members).
     *
     * @param organizerIds set of organizer user IDs
     * @param pageable pagination and sorting parameters
     * @return Page of EventEntity for any of the given organizers
     */
    Page<EventEntity> getEventsByOrganizerIds(Set<UUID> organizerIds, Pageable pageable);

    /**
     * Retrieves events with marketing enabled.
     * 
     * @param pageable pagination and sorting parameters
     * @return Page of EventEntity with marketing enabled
     */
    Page<EventEntity> getMarketingEnabledEvents(Pageable pageable);

    /**
     * Retrieves events where a user has purchased tickets.
     *
     * @param userId the UUID of the user
     * @param pageable pagination and sorting parameters
     * @return Page of EventEntity where user has purchased tickets
     */
    Page<EventEntity> getEventsByUserPurchases(UUID userId, Pageable pageable);

    /**
     * Retrieves published events with pagination.
     *
     * @param pageable pagination and sorting parameters
     * @return Page of published EventEntity
     */
    Page<EventEntity> getPublishedEvents(Pageable pageable);

    /**
     * Retrieves events by organizer and status.
     *
     * @param organizerId the UUID of the organizer
     * @param status the event status
     * @param pageable pagination and sorting parameters
     * @return Page of EventEntity matching criteria
     */
    Page<EventEntity> getEventsByOrganizerAndStatus(UUID organizerId, EventStatus status, Pageable pageable);

    /**
     * Publishes an event (changes status to PUBLISHED).
     * Validates that event has required data before publishing.
     *
     * @param eventId the UUID of the event to publish
     * @return published EventEntity
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if event not found
     * @throws IllegalStateException if event is not ready to be published
     */
    EventEntity publishEvent(UUID eventId);
}

