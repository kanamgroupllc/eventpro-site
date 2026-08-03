package com.accessplus.eventpro.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** Sales velocity pulse for an event: trending_up, steady, or slowing. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventPulseResponse {
    private UUID eventId;
    private String eventName;
    /** trending_up | steady | slowing */
    private String velocity;
    /** e.g. +20 for +20% vs last week, 0 for steady, -15 for slowing */
    private Double percentChange;
    private String label;
}
