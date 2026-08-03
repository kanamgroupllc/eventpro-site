package com.accessplus.eventpro.event.event.service.impl;

import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.event.address.entity.AddressEntity;
import com.accessplus.eventpro.event.address.repository.AddressRepository;
import com.accessplus.eventpro.event.category.entity.CategoryEntity;
import com.accessplus.eventpro.event.category.repository.CategoryRepository;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.event.event.service.EventService;
import com.accessplus.eventpro.event.service.AWSS3ImageService;
import com.accessplus.eventpro.shared.enums.EventStatus;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.event.ticket.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class EventServiceImpl implements EventService {

    private final EventRepository eventRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final AWSS3ImageService imageService;
    private final TicketRepository ticketRepository;

    /**
     * Creates a new event with optional image upload.
     */
    @Override
    public EventEntity createEvent(EventEntity event, UUID organizerId, UUID categoryId, MultipartFile imageFile) 
            throws IOException {
        log.debug("Creating event: name={}, organizerId={}, categoryId={}", 
                event.getName(), organizerId, categoryId);

        // Validate and fetch organizer
        UserEntity organizer = userRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", organizerId.toString()));

        // Validate and fetch category
        CategoryEntity category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", categoryId.toString()));

        // Validate event data
        validateEventData(event);

        // Set relationships
        event.setOrganizer(organizer);
        event.setCategory(category);

        // Handle address (if provided)
        if (event.getAddress() != null) {
            AddressEntity address = event.getAddress();
            // Save address first (cascade will handle it, but explicit save ensures proper ID)
            address = addressRepository.save(address);
            event.setAddress(address);
        }

        // Handle image upload
        if (imageFile != null && !imageFile.isEmpty()) {
            try {
                // Validate image
                imageService.validateImage(imageFile);
                
                // Generate S3 key: events/{eventId}/{filename}
                String imageKey = String.format("events/%s/%s", 
                        UUID.randomUUID(), 
                        imageFile.getOriginalFilename() != null ? 
                                imageFile.getOriginalFilename() : "image.jpg");
                
                // Upload image to S3
                String imageUrl = imageService.uploadImage(imageFile, imageKey);
                event.setImageUrl(imageUrl);
                
                log.info("Image uploaded successfully for event: url={}", imageUrl);
            } catch (IOException e) {
                log.error("Failed to upload image for event: {}", e.getMessage(), e);
                throw new IOException("Failed to upload event image: " + e.getMessage(), e);
            }
        }

        // Save event
        EventEntity savedEvent = eventRepository.save(event);
        log.info("Event created successfully: id={}, name={}", savedEvent.getId(), savedEvent.getName());
        
        return savedEvent;
    }

    /**
     * Updates an existing event.
     */
    @Override
    public EventEntity updateEvent(UUID eventId, EventEntity eventUpdate, UUID categoryId, MultipartFile imageFile) 
            throws IOException {
        log.debug("Updating event: id={}", eventId);

        // Fetch existing event
        EventEntity existingEvent = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));

        // Update fields if provided (only non-null values)
        if (eventUpdate.getName() != null && !eventUpdate.getName().trim().isEmpty()) {
            existingEvent.setName(eventUpdate.getName());
        }
        if (eventUpdate.getDescription() != null) {
            existingEvent.setDescription(eventUpdate.getDescription());
        }
        if (eventUpdate.getStartTime() != null) {
            existingEvent.setStartTime(eventUpdate.getStartTime());
        }
        if (eventUpdate.getEndTime() != null) {
            existingEvent.setEndTime(eventUpdate.getEndTime());
        }
        if (eventUpdate.getMarketingEnabled() != null) {
            existingEvent.setMarketingEnabled(eventUpdate.getMarketingEnabled());
        }
        if (eventUpdate.getStatus() != null) {
            existingEvent.setStatus(eventUpdate.getStatus());
        }
        if (eventUpdate.getImageUrl() != null) {
            existingEvent.setImageUrl(eventUpdate.getImageUrl());
        }
        if (eventUpdate.getPromotionalVideoUrl() != null) {
            existingEvent.setPromotionalVideoUrl(eventUpdate.getPromotionalVideoUrl().trim().isEmpty() ? null : eventUpdate.getPromotionalVideoUrl().trim());
        }
        if (eventUpdate.getEventPageTemplate() != null && !eventUpdate.getEventPageTemplate().trim().isEmpty()) {
            existingEvent.setEventPageTemplate(eventUpdate.getEventPageTemplate().trim());
        }
        if (eventUpdate.getDonationsEnabled() != null) {
            existingEvent.setDonationsEnabled(eventUpdate.getDonationsEnabled());
        }
        if (eventUpdate.getCustomDomain() != null) {
            existingEvent.setCustomDomain(eventUpdate.getCustomDomain().trim().isEmpty() ? null : eventUpdate.getCustomDomain().trim());
        }
        if (eventUpdate.getReservedSeatingEnabled() != null) {
            existingEvent.setReservedSeatingEnabled(eventUpdate.getReservedSeatingEnabled());
        }

        // Update category if provided
        if (categoryId != null) {
            CategoryEntity category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category", categoryId.toString()));
            existingEvent.setCategory(category);
        }

        // Update address if provided
        if (eventUpdate.getAddress() != null) {
            AddressEntity newAddress = eventUpdate.getAddress();
            AddressEntity existingAddress = existingEvent.getAddress();
            
            if (existingAddress != null) {
                // Update existing address
                existingAddress.setStreet(newAddress.getStreet());
                existingAddress.setCity(newAddress.getCity());
                existingAddress.setState(newAddress.getState());
                existingAddress.setZipCode(newAddress.getZipCode());
                existingAddress.setCountry(newAddress.getCountry());
                if (newAddress.getLatitude() != null) {
                    existingAddress.setLatitude(newAddress.getLatitude());
                }
                if (newAddress.getLongitude() != null) {
                    existingAddress.setLongitude(newAddress.getLongitude());
                }
                addressRepository.save(existingAddress);
            } else {
                // Create new address
                AddressEntity savedAddress = addressRepository.save(newAddress);
                existingEvent.setAddress(savedAddress);
            }
        }

        // Handle image update
        if (imageFile != null && !imageFile.isEmpty()) {
            try {
                // Validate new image
                imageService.validateImage(imageFile);
                
                // Delete old image if exists
                if (existingEvent.getImageUrl() != null && !existingEvent.getImageUrl().isEmpty()) {
                    try {
                        String oldImageKey = extractImageKeyFromUrl(existingEvent.getImageUrl());
                        imageService.deleteImage(oldImageKey);
                        log.debug("Deleted old event image: key={}", oldImageKey);
                    } catch (Exception e) {
                        log.warn("Failed to delete old event image: {}", e.getMessage());
                        // Continue with new image upload even if old deletion fails
                    }
                }
                
                // Upload new image
                String imageKey = String.format("events/%s/%s", 
                        eventId, 
                        imageFile.getOriginalFilename() != null ? 
                                imageFile.getOriginalFilename() : "image.jpg");
                String imageUrl = imageService.uploadImage(imageFile, imageKey);
                existingEvent.setImageUrl(imageUrl);
                
                log.info("Event image updated: url={}", imageUrl);
            } catch (IOException e) {
                log.error("Failed to upload new image for event: {}", e.getMessage(), e);
                throw new IOException("Failed to upload event image: " + e.getMessage(), e);
            }
        }

        // Validate updated event data
        validateEventData(existingEvent);

        // Save updated event
        EventEntity updatedEvent = eventRepository.save(existingEvent);
        log.info("Event updated successfully: id={}, name={}", updatedEvent.getId(), updatedEvent.getName());
        
        return updatedEvent;
    }

    /**
     * Deletes an event by ID.
     */
    @Override
    public void deleteEvent(UUID eventId) {
        log.debug("Deleting event: id={}", eventId);

        EventEntity event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));

        // Delete image from S3 if exists
        if (event.getImageUrl() != null && !event.getImageUrl().isEmpty()) {
            try {
                String imageKey = extractImageKeyFromUrl(event.getImageUrl());
                imageService.deleteImage(imageKey);
                log.debug("Deleted event image from S3: key={}", imageKey);
            } catch (Exception e) {
                log.warn("Failed to delete event image from S3: {}", e.getMessage());
                // Continue with event deletion even if image deletion fails
            }
        }

        // Delete event (cascade will handle address deletion)
        eventRepository.delete(event);
        log.info("Event deleted successfully: id={}", eventId);
    }

    /**
     * Retrieves an event by ID.
     */
    @Override
    @Transactional(readOnly = true)
    public EventEntity getEventById(UUID eventId) {
        log.debug("Retrieving event: id={}", eventId);
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));
    }

    /**
     * Retrieves all events with pagination.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<EventEntity> getAllEvents(Pageable pageable) {
        log.debug("Retrieving all events: page={}, size={}", pageable.getPageNumber(), pageable.getPageSize());
        return eventRepository.findAll(pageable);
    }

    /**
     * Retrieves events by category with pagination.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<EventEntity> getEventsByCategory(UUID categoryId, Pageable pageable) {
        log.debug("Retrieving events by category: categoryId={}", categoryId);
        
        // Validate category exists
        categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", categoryId.toString()));
        
        return eventRepository.findByCategoryId(categoryId, pageable);
    }

    /**
     * Retrieves events by organizer with pagination.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<EventEntity> getEventsByOrganizer(UUID organizerId, Pageable pageable) {
        log.debug("Retrieving events by organizer: organizerId={}", organizerId);
        
        // Validate organizer exists
        userRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", organizerId.toString()));
        
        return eventRepository.findByOrganizerId(organizerId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EventEntity> getEventsByOrganizerIds(Set<UUID> organizerIds, Pageable pageable) {
        if (organizerIds == null || organizerIds.isEmpty()) {
            return Page.empty(pageable);
        }
        log.debug("Retrieving events by organizer ids: count={}", organizerIds.size());
        return eventRepository.findByOrganizerIdIn(organizerIds, pageable);
    }

    /**
     * Retrieves events with marketing enabled.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<EventEntity> getMarketingEnabledEvents(Pageable pageable) {
        log.debug("Retrieving marketing enabled events");
        return eventRepository.findByMarketingEnabled(true, pageable);
    }

    /**
     * Retrieves events where a user has purchased tickets.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<EventEntity> getEventsByUserPurchases(UUID userId, Pageable pageable) {
        log.debug("Retrieving events for user purchases: userId={}", userId);
        
        // Validate user exists
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));
        
        return eventRepository.findEventsByUserPurchases(userId, pageable);
    }

    /**
     * Validates event data before save.
     * 
     * @param event the event to validate
     * @throws IllegalArgumentException if validation fails
     */
    private void validateEventData(EventEntity event) {
        if (event.getName() == null || event.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Event name is required");
        }

        if (event.getStartTime() == null) {
            throw new IllegalArgumentException("Event start time is required");
        }

        if (event.getEndTime() == null) {
            throw new IllegalArgumentException("Event end time is required");
        }

        if (event.getEndTime().isBefore(event.getStartTime()) || 
            event.getEndTime().isEqual(event.getStartTime())) {
            throw new IllegalArgumentException("Event end time must be after start time");
        }
    }

    /**
     * Extracts S3 key from image URL.
     * Handles both AWS S3 URLs and LocalStack URLs.
     * 
     * @param imageUrl the full image URL
     * @return S3 key (path)
     */
    private String extractImageKeyFromUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isEmpty()) {
            return "";
        }

        // For LocalStack: http://localhost:4566/bucket/key
        // For AWS: https://bucket.s3.region.amazonaws.com/key
        try {
            if (imageUrl.contains("/events/")) {
                int eventsIndex = imageUrl.indexOf("/events/");
                return imageUrl.substring(eventsIndex + 1); // Remove leading slash
            } else if (imageUrl.contains(".s3.")) {
                // AWS format: extract key after bucket name
                int keyStart = imageUrl.indexOf(".s3.") + 4;
                keyStart = imageUrl.indexOf("/", keyStart) + 1;
                return imageUrl.substring(keyStart);
            }
        } catch (Exception e) {
            log.warn("Failed to extract key from URL: {}, using full URL as key", imageUrl, e);
        }

        // Fallback: return last part of URL
        return imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
    }

    /**
     * Retrieves published events with pagination.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<EventEntity> getPublishedEvents(Pageable pageable) {
        log.debug("Retrieving published events");
        return eventRepository.findByStatus(EventStatus.PUBLISHED, pageable);
    }

    /**
     * Retrieves events by organizer and status.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<EventEntity> getEventsByOrganizerAndStatus(UUID organizerId, EventStatus status, Pageable pageable) {
        log.debug("Retrieving events by organizer and status: organizerId={}, status={}", organizerId, status);

        // Validate organizer exists
        userRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", organizerId.toString()));

        return eventRepository.findByOrganizerIdAndStatus(organizerId, status, pageable);
    }

    /**
     * Publishes an event (changes status to PUBLISHED).
     * Validates that event has required data before publishing.
     */
    @Override
    public EventEntity publishEvent(UUID eventId) {
        log.debug("Publishing event: id={}", eventId);

        EventEntity event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));

        // Validate event is ready to be published
        if (event.getStatus() == EventStatus.PUBLISHED) {
            throw new IllegalStateException("Event is already published");
        }

        if (event.getStatus() == EventStatus.CANCELLED) {
            throw new IllegalStateException("Cannot publish a cancelled event");
        }

        // Validate required fields for publishing
        if (event.getImageUrl() == null || event.getImageUrl().trim().isEmpty()) {
            throw new IllegalStateException("Event must have an image before publishing");
        }

        if (event.getAddress() == null) {
            throw new IllegalStateException("Event must have an address before publishing");
        }

        // Check if event has at least one ticket
        long ticketCount = ticketRepository.countByEventIdAndStatus(eventId,
                com.accessplus.eventpro.shared.enums.TicketStatus.AVAILABLE);
        if (ticketCount == 0) {
            throw new IllegalStateException("Event must have at least one available ticket before publishing");
        }

        // Update status to PUBLISHED
        event.setStatus(EventStatus.PUBLISHED);
        EventEntity publishedEvent = eventRepository.save(event);

        log.info("Event published successfully: id={}, name={}, ticketCount={}",
                eventId, event.getName(), ticketCount);
        return publishedEvent;
    }
}

