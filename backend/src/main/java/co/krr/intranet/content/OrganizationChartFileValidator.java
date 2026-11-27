package co.krr.intranet.content;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
public class OrganizationChartFileValidator {
    public static final long MAX_FILE_SIZE = 20L * 1024 * 1024;

    public ValidatedChart validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a PDF to upload.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "PDF files cannot exceed 20 MB.");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The PDF must have a filename.");
        }
        filename = filename.replace('\\', '/');
        filename = filename.substring(filename.lastIndexOf('/') + 1).trim();
        if (filename.length() > 255 || filename.startsWith(".")
                || !filename.toLowerCase(java.util.Locale.ROOT).endsWith(".pdf")) {
            throw unsupportedPdf();
        }
        filename = filename.replaceAll("[\\p{Cntrl}]", "");

        try {
            byte[] content = file.getBytes();
            if (content.length < 8 || !startsWith(content, "%PDF-".getBytes(StandardCharsets.US_ASCII))) {
                throw unsupportedPdf();
            }
            int tailStart = Math.max(0, content.length - 2048);
            String tail = new String(content, tailStart, content.length - tailStart, StandardCharsets.ISO_8859_1);
            if (!tail.contains("%%EOF")) throw unsupportedPdf();
            return new ValidatedChart(filename, content);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The uploaded PDF could not be read.");
        }
    }

    private boolean startsWith(byte[] content, byte[] prefix) {
        for (int index = 0; index < prefix.length; index++) {
            if (content[index] != prefix[index]) return false;
        }
        return true;
    }

    private ResponseStatusException unsupportedPdf() {
        return new ResponseStatusException(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "Upload a valid PDF file.");
    }

    public record ValidatedChart(String filename, byte[] content) {}
}
