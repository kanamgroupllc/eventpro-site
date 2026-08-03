package com.accessplus.eventpro.event.event.service.impl;

import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.event.address.entity.AddressEntity;
import com.accessplus.eventpro.event.address.repository.AddressRepository;
import com.accessplus.eventpro.event.category.entity.CategoryEntity;
import com.accessplus.eventpro.event.category.repository.CategoryRepository;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.event.service.AWSS3ImageService;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EventServiceImplTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AddressRepository addressRepository;

    @Mock
    private AWSS3ImageService imageService;

    @InjectMocks
    private EventServiceImpl eventService;

    private UserEntity organizer;
    private CategoryEntity category;
    private EventEntity event;
    private AddressEntity address;
    private UUID organizerId;
    private UUID categoryId;
    private UUID eventId;

    @BeforeEach
    void setUp() {
        organizerId = UUID.randomUUID();
        categoryId = UUID.randomUUID();
        eventId = UUID.randomUUID();

        organizer = new UserEntity();
        organizer.setId(organizerId);
        organizer.setEmail("organizer@test.com");
        organizer.setFirstName("John");
        organizer.setLastName("Doe");

        category = new CategoryEntity();
        category.setId(categoryId);
        category.setName("Music");

        address = new AddressEntity();
        address.setStreet("123 Main St");
        address.setCity("New York");
        address.setState("NY");
        address.setZipCode("10001");
        address.setCountry("USA");

        event = new EventEntity();
        event.setId(eventId);
        event.setName("Test Event");
        event.setDescription("Test Description");
        event.setStartTime(LocalDateTime.now().plusDays(1));
        event.setEndTime(LocalDateTime.now().plusDays(2));
        event.setMarketingEnabled(false);
        event.setOrganizer(organizer);
        event.setCategory(category);
        event.setAddress(address);
    }

    @Test
    void testCreateEvent_Success() throws IOException {
        // Given
        when(userRepository.findById(organizerId)).thenReturn(Optional.of(organizer));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(addressRepository.save(any(AddressEntity.class))).thenReturn(address);
        when(eventRepository.save(any(EventEntity.class))).thenReturn(event);

        // When
        EventEntity result = eventService.createEvent(event, organizerId, categoryId, null);

        // Then
        assertNotNull(result);
        assertEquals(eventId, result.getId());
        verify(userRepository, times(1)).findById(organizerId);
        verify(categoryRepository, times(1)).findById(categoryId);
        verify(eventRepository, times(1)).save(any(EventEntity.class));
    }

    @Test
    void testCreateEvent_WithImage() throws IOException {
        // Given
        MultipartFile imageFile = createMockImageFile("test.jpg", "image/jpeg", 1024);
        String imageUrl = "https://bucket.s3.amazonaws.com/events/test.jpg";
        
        when(userRepository.findById(organizerId)).thenReturn(Optional.of(organizer));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(addressRepository.save(any(AddressEntity.class))).thenReturn(address);
        when(imageService.uploadImage(any(MultipartFile.class), anyString())).thenReturn(imageUrl);
        when(eventRepository.save(any(EventEntity.class))).thenAnswer(invocation -> {
            EventEntity e = invocation.getArgument(0);
            e.setImageUrl(imageUrl);
            return e;
        });

        // When
        EventEntity result = eventService.createEvent(event, organizerId, categoryId, imageFile);

        // Then
        assertNotNull(result);
        assertEquals(imageUrl, result.getImageUrl());
        verify(imageService, times(1)).validateImage(imageFile);
        verify(imageService, times(1)).uploadImage(any(MultipartFile.class), anyString());
    }

    @Test
    void testCreateEvent_OrganizerNotFound() {
        // Given
        when(userRepository.findById(organizerId)).thenReturn(Optional.empty());

        // When/Then
        assertThrows(ResourceNotFoundException.class, () -> 
                eventService.createEvent(event, organizerId, categoryId, null));
        verify(eventRepository, never()).save(any());
    }

    @Test
    void testCreateEvent_CategoryNotFound() {
        // Given
        when(userRepository.findById(organizerId)).thenReturn(Optional.of(organizer));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.empty());

        // When/Then
        assertThrows(ResourceNotFoundException.class, () -> 
                eventService.createEvent(event, organizerId, categoryId, null));
        verify(eventRepository, never()).save(any());
    }

    @Test
    void testCreateEvent_InvalidEventData() {
        // Given
        event.setName(null); // Invalid: name is required
        when(userRepository.findById(organizerId)).thenReturn(Optional.of(organizer));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));

        // When/Then
        assertThrows(IllegalArgumentException.class, () -> 
                eventService.createEvent(event, organizerId, categoryId, null));
        verify(eventRepository, never()).save(any());
    }

    @Test
    void testCreateEvent_EndTimeBeforeStartTime() {
        // Given
        event.setStartTime(LocalDateTime.now().plusDays(2));
        event.setEndTime(LocalDateTime.now().plusDays(1)); // Invalid: end before start
        when(userRepository.findById(organizerId)).thenReturn(Optional.of(organizer));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));

        // When/Then
        assertThrows(IllegalArgumentException.class, () -> 
                eventService.createEvent(event, organizerId, categoryId, null));
        verify(eventRepository, never()).save(any());
    }

    @Test
    void testUpdateEvent_Success() throws IOException {
        // Given
        EventEntity existingEvent = new EventEntity();
        existingEvent.setId(eventId);
        existingEvent.setName("Old Name");
        existingEvent.setDescription("Old Description");
        existingEvent.setStartTime(LocalDateTime.now().plusDays(1));
        existingEvent.setEndTime(LocalDateTime.now().plusDays(2));
        existingEvent.setOrganizer(organizer);
        existingEvent.setCategory(category);

        EventEntity updateData = new EventEntity();
        updateData.setName("New Name");
        updateData.setDescription("New Description");

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(existingEvent));
        when(eventRepository.save(any(EventEntity.class))).thenReturn(existingEvent);

        // When
        EventEntity result = eventService.updateEvent(eventId, updateData, null, null);

        // Then
        assertNotNull(result);
        verify(eventRepository, times(1)).findById(eventId);
        verify(eventRepository, times(1)).save(any(EventEntity.class));
    }

    @Test
    void testUpdateEvent_WithCategoryUpdate() throws IOException {
        // Given
        UUID newCategoryId = UUID.randomUUID();
        CategoryEntity newCategory = new CategoryEntity();
        newCategory.setId(newCategoryId);
        newCategory.setName("Sports");

        EventEntity existingEvent = new EventEntity();
        existingEvent.setId(eventId);
        existingEvent.setName("Event");
        existingEvent.setStartTime(LocalDateTime.now().plusDays(1));
        existingEvent.setEndTime(LocalDateTime.now().plusDays(2));
        existingEvent.setOrganizer(organizer);
        existingEvent.setCategory(category);

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(existingEvent));
        when(categoryRepository.findById(newCategoryId)).thenReturn(Optional.of(newCategory));
        when(eventRepository.save(any(EventEntity.class))).thenReturn(existingEvent);

        // When
        eventService.updateEvent(eventId, new EventEntity(), newCategoryId, null);

        // Then
        verify(categoryRepository, times(1)).findById(newCategoryId);
        verify(eventRepository, times(1)).save(any(EventEntity.class));
    }

    @Test
    void testUpdateEvent_WithImageUpdate() throws IOException {
        // Given
        String oldImageUrl = "https://bucket.s3.amazonaws.com/events/old.jpg";
        String newImageUrl = "https://bucket.s3.amazonaws.com/events/new.jpg";
        MultipartFile newImageFile = createMockImageFile("new.jpg", "image/jpeg", 2048);

        EventEntity existingEvent = new EventEntity();
        existingEvent.setId(eventId);
        existingEvent.setName("Event");
        existingEvent.setStartTime(LocalDateTime.now().plusDays(1));
        existingEvent.setEndTime(LocalDateTime.now().plusDays(2));
        existingEvent.setImageUrl(oldImageUrl);
        existingEvent.setOrganizer(organizer);
        existingEvent.setCategory(category);

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(existingEvent));
        when(imageService.uploadImage(any(MultipartFile.class), anyString())).thenReturn(newImageUrl);
        when(eventRepository.save(any(EventEntity.class))).thenReturn(existingEvent);

        // When
        eventService.updateEvent(eventId, new EventEntity(), null, newImageFile);

        // Then
        verify(imageService, times(1)).validateImage(newImageFile);
        verify(imageService, times(1)).deleteImage(anyString());
        verify(imageService, times(1)).uploadImage(any(MultipartFile.class), anyString());
    }

    @Test
    void testUpdateEvent_NotFound() {
        // Given
        when(eventRepository.findById(eventId)).thenReturn(Optional.empty());

        // When/Then
        assertThrows(ResourceNotFoundException.class, () -> 
                eventService.updateEvent(eventId, new EventEntity(), null, null));
    }

    @Test
    void testDeleteEvent_Success() {
        // Given
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        doNothing().when(eventRepository).delete(any(EventEntity.class));

        // When
        eventService.deleteEvent(eventId);

        // Then
        verify(eventRepository, times(1)).findById(eventId);
        verify(eventRepository, times(1)).delete(event);
    }

    @Test
    void testDeleteEvent_WithImage() throws IOException {
        // Given
        event.setImageUrl("https://bucket.s3.amazonaws.com/events/image.jpg");
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        doNothing().when(imageService).deleteImage(anyString());
        doNothing().when(eventRepository).delete(any(EventEntity.class));

        // When
        eventService.deleteEvent(eventId);

        // Then
        verify(imageService, times(1)).deleteImage(anyString());
        verify(eventRepository, times(1)).delete(event);
    }

    @Test
    void testDeleteEvent_NotFound() {
        // Given
        when(eventRepository.findById(eventId)).thenReturn(Optional.empty());

        // When/Then
        assertThrows(ResourceNotFoundException.class, () -> eventService.deleteEvent(eventId));
        verify(eventRepository, never()).delete(any());
    }

    @Test
    void testGetEventById_Success() {
        // Given
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        // When
        EventEntity result = eventService.getEventById(eventId);

        // Then
        assertNotNull(result);
        assertEquals(eventId, result.getId());
        verify(eventRepository, times(1)).findById(eventId);
    }

    @Test
    void testGetEventById_NotFound() {
        // Given
        when(eventRepository.findById(eventId)).thenReturn(Optional.empty());

        // When/Then
        assertThrows(ResourceNotFoundException.class, () -> eventService.getEventById(eventId));
    }

    @Test
    void testGetAllEvents_Success() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        Page<EventEntity> page = new PageImpl<>(List.of(event), pageable, 1);
        when(eventRepository.findAll(pageable)).thenReturn(page);

        // When
        Page<EventEntity> result = eventService.getAllEvents(pageable);

        // Then
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(eventRepository, times(1)).findAll(pageable);
    }

    @Test
    void testGetEventsByCategory_Success() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        Page<EventEntity> page = new PageImpl<>(List.of(event), pageable, 1);
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(eventRepository.findByCategoryId(categoryId, pageable)).thenReturn(page);

        // When
        Page<EventEntity> result = eventService.getEventsByCategory(categoryId, pageable);

        // Then
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(categoryRepository, times(1)).findById(categoryId);
        verify(eventRepository, times(1)).findByCategoryId(categoryId, pageable);
    }

    @Test
    void testGetEventsByCategory_CategoryNotFound() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.empty());

        // When/Then
        assertThrows(ResourceNotFoundException.class, () -> 
                eventService.getEventsByCategory(categoryId, pageable));
        verify(eventRepository, never()).findByCategoryId(any(), any());
    }

    @Test
    void testGetEventsByOrganizer_Success() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        Page<EventEntity> page = new PageImpl<>(List.of(event), pageable, 1);
        when(userRepository.findById(organizerId)).thenReturn(Optional.of(organizer));
        when(eventRepository.findByOrganizerId(organizerId, pageable)).thenReturn(page);

        // When
        Page<EventEntity> result = eventService.getEventsByOrganizer(organizerId, pageable);

        // Then
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(userRepository, times(1)).findById(organizerId);
        verify(eventRepository, times(1)).findByOrganizerId(organizerId, pageable);
    }

    @Test
    void testGetEventsByOrganizer_OrganizerNotFound() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        when(userRepository.findById(organizerId)).thenReturn(Optional.empty());

        // When/Then
        assertThrows(ResourceNotFoundException.class, () -> 
                eventService.getEventsByOrganizer(organizerId, pageable));
        verify(eventRepository, never()).findByOrganizerId(any(), any());
    }

    @Test
    void testGetMarketingEnabledEvents_Success() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        event.setMarketingEnabled(true);
        Page<EventEntity> page = new PageImpl<>(List.of(event), pageable, 1);
        when(eventRepository.findByMarketingEnabled(true, pageable)).thenReturn(page);

        // When
        Page<EventEntity> result = eventService.getMarketingEnabledEvents(pageable);

        // Then
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(eventRepository, times(1)).findByMarketingEnabled(true, pageable);
    }

    @Test
    void testCreateEvent_ImageUploadFails() throws IOException {
        // Given
        MultipartFile imageFile = createMockImageFile("test.jpg", "image/jpeg", 1024);
        when(userRepository.findById(organizerId)).thenReturn(Optional.of(organizer));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(imageService.uploadImage(any(MultipartFile.class), anyString()))
                .thenThrow(new IOException("S3 upload failed"));

        // When/Then
        assertThrows(IOException.class, () -> 
                eventService.createEvent(event, organizerId, categoryId, imageFile));
        verify(eventRepository, never()).save(any());
    }

    // Helper method to create mock MultipartFile
    private MultipartFile createMockImageFile(String filename, String contentType, long size) {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn(filename);
        when(file.getContentType()).thenReturn(contentType);
        when(file.getSize()).thenReturn(size);
        when(file.isEmpty()).thenReturn(false);
        try {
            when(file.getInputStream()).thenReturn(new java.io.ByteArrayInputStream(new byte[(int) size]));
        } catch (IOException e) {
            // Should not happen in tests
        }
        return file;
    }
}

