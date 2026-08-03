package com.accessplus.eventpro.event.ticket.service;

import java.io.IOException;
import java.util.UUID;

public interface QRCodeService {

    byte[] generateQRCode(UUID ticketId) throws IOException;

    String uploadQRCodeToS3(byte[] qrCodeImage, UUID ticketId) throws IOException;

    String getQRCodeUrl(UUID ticketId);

    String generateAndUploadQRCode(UUID ticketId) throws IOException;
}

