package com.accessplus.eventpro.event.ticket.service;

import com.accessplus.eventpro.shared.entity.TicketEntity;

import java.io.IOException;

public interface TicketPdfService {
    
    byte[] generateTicketPdf(TicketEntity ticket) throws IOException;
}

