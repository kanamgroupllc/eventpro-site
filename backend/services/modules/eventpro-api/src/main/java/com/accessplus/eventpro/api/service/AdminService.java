package com.accessplus.eventpro.api.service;

import com.accessplus.eventpro.api.dto.AdminStatsResponse;
import com.accessplus.eventpro.api.dto.EventSaleResponse;
import com.accessplus.eventpro.api.dto.RevenueDataResponse;

import java.util.List;

public interface AdminService {
    
    AdminStatsResponse getPlatformStats();
    
    List<EventSaleResponse> getEventSales();
    
    List<RevenueDataResponse> getRevenueData(String period);
}

