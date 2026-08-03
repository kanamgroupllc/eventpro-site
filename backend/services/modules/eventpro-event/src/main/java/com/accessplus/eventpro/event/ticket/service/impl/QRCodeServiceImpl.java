package com.accessplus.eventpro.event.ticket.service.impl;

import com.accessplus.eventpro.event.config.S3Properties;
import com.accessplus.eventpro.event.ticket.service.QRCodeService;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Implementation of QR code service.
 * Generates QR codes for tickets and uploads them to S3.
 * 
 * <p>Features:
 * <ul>
 *   <li>QR code generation using ZXing library</li>
 *   <li>Error correction level: M (Medium, ~15% recovery)</li>
 *   <li>Default size: 300x300 pixels</li>
 *   <li>PNG format output</li>
 *   <li>Automatic S3 key generation: qr-codes/{ticketId}.png</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QRCodeServiceImpl implements QRCodeService {

    private static final int QR_CODE_WIDTH = 300;
    private static final int QR_CODE_HEIGHT = 300;
    private static final String QR_CODE_FORMAT = "PNG";
    private static final String QR_CODE_CONTENT_TYPE = "image/png";
    private static final String S3_KEY_PREFIX = "qr-codes/";

    private final S3Client s3Client;
    private final S3Properties s3Properties;
    private final QRCodeWriter qrCodeWriter = new QRCodeWriter();

    /**
     * Generates a QR code image for a ticket.
     * The QR code contains the ticket ID as its content.
     */
    @Override
    public byte[] generateQRCode(UUID ticketId) throws IOException {
        log.debug("Generating QR code for ticket: {}", ticketId);

        try {
            // Prepare encoding hints
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M); // Medium error correction (~15%)
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 1); // Quiet zone margin

            // Encode ticket ID into QR code
            String content = ticketId.toString();
            BitMatrix bitMatrix = qrCodeWriter.encode(
                    content,
                    BarcodeFormat.QR_CODE,
                    QR_CODE_WIDTH,
                    QR_CODE_HEIGHT,
                    hints
            );

            // Convert BitMatrix to PNG image bytes
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, QR_CODE_FORMAT, outputStream);
            byte[] qrCodeImage = outputStream.toByteArray();

            log.info("Successfully generated QR code for ticket: {}, size={} bytes", ticketId, qrCodeImage.length);
            return qrCodeImage;

        } catch (WriterException e) {
            log.error("Failed to generate QR code for ticket: {}, error={}", ticketId, e.getMessage(), e);
            throw new IOException("Failed to generate QR code: " + e.getMessage(), e);
        }
    }

    /**
     * Uploads a QR code image to S3.
     */
    @Override
    public String uploadQRCodeToS3(byte[] qrCodeImage, UUID ticketId) throws IOException {
        log.debug("Uploading QR code to S3 for ticket: {}", ticketId);

        // Generate S3 key: qr-codes/{ticketId}.png
        String s3Key = S3_KEY_PREFIX + ticketId + ".png";

        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(s3Properties.getBucketName())
                    .key(s3Key)
                    .contentType(QR_CODE_CONTENT_TYPE)
                    .contentLength((long) qrCodeImage.length)
                    .build();

            // Upload QR code to S3
            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(qrCodeImage));

            // Generate and return public URL
            String qrCodeUrl = getQRCodeUrl(ticketId);
            log.info("Successfully uploaded QR code to S3: key={}, url={}", s3Key, qrCodeUrl);
            return qrCodeUrl;

        } catch (S3Exception e) {
            log.error("Failed to upload QR code to S3: key={}, error={}", s3Key, e.getMessage(), e);
            throw new IOException("Failed to upload QR code to S3: " + e.getMessage(), e);
        }
    }

    /**
     * Gets the S3 URL for a ticket's QR code.
     */
    @Override
    public String getQRCodeUrl(UUID ticketId) {
        String s3Key = S3_KEY_PREFIX + ticketId + ".png";
        
        String endpoint = s3Properties.getEndpoint();
        String publicEndpoint = s3Properties.getPublicEndpoint();
        
        // Use publicEndpoint if configured (for frontend-accessible URLs), otherwise use endpoint
        String urlEndpoint = (publicEndpoint != null && !publicEndpoint.isEmpty()) 
                ? publicEndpoint 
                : endpoint;
        
        if (urlEndpoint != null && !urlEndpoint.isEmpty()) {
            // LocalStack format: http://localhost:4566/bucket-name/qr-codes/{ticketId}.png
            return String.format("%s/%s/%s", urlEndpoint, s3Properties.getBucketName(), s3Key);
        } else {
            // AWS S3: https://bucket-name.s3.region.amazonaws.com/qr-codes/{ticketId}.png
            String region = s3Client.serviceClientConfiguration().region().id();
            return String.format("https://%s.s3.%s.amazonaws.com/%s", 
                    s3Properties.getBucketName(), region, s3Key);
        }
    }

    /**
     * Generates and uploads a QR code for a ticket in one operation.
     */
    @Override
    public String generateAndUploadQRCode(UUID ticketId) throws IOException {
        log.debug("Generating and uploading QR code for ticket: {}", ticketId);
        
        // Generate QR code
        byte[] qrCodeImage = generateQRCode(ticketId);
        
        // Upload to S3
        return uploadQRCodeToS3(qrCodeImage, ticketId);
    }
}
