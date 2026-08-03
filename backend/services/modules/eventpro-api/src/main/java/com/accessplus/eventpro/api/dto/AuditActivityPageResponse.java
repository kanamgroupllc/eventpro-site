package com.accessplus.eventpro.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Paginated audit feed for scalable admin UI (indexed DB query). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditActivityPageResponse {
    private List<AuditActivityResponse> content;
    private long totalElements;
    private int totalPages;
    /** 1-based page index (matches admin API convention). */
    private int page;
    private int size;
}
