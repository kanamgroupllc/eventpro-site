package com.accessplus.eventpro.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizerInsightsResponse {
    private String aiInsight;
    private List<EventPulseResponse> eventPulses;
    private List<CulturalInterestResponse> topCulturalInterests;
}
