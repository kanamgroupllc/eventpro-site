package com.accessplus.eventpro.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One tax form (e.g. 1099-K) for a year. Used in Document Vault list.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxFormResponse {

    private String year;
    private String formType;   // "1099-K"
    private String status;     // "Available", "Generating"
    private String downloadUrl; // optional, when available
}
