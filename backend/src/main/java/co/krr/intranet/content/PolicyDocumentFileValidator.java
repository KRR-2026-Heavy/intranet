package co.krr.intranet.content;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;
import java.util.zip.ZipInputStream;

@Component
public class PolicyDocumentFileValidator {
    public static final long MAX_FILE_SIZE = 20L * 1024 * 1024;
    private static final long MAX_OFFICE_EXPANDED_SIZE = 100L * 1024 * 1024;

    public ValidatedFile validate(MultipartFile upload) {
        if (upload == null || upload.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a non-empty document to upload.");
        }
        if (upload.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Policy files cannot exceed 20 MB.");
        }

        String filename = sanitizeFilename(upload.getOriginalFilename());
        String extension = extensionOf(filename);
        byte[] bytes;
        try {
            bytes = upload.getBytes();
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The uploaded file could not be read.");
        }

        String mediaType = mediaTypeFor(extension);
        if (!matchesFormat(extension, bytes)) {
            throw new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "The uploaded file content does not match its supported file extension.");
        }
        return new ValidatedFile(filename, mediaType, bytes);
    }

    private String sanitizeFilename(String original) {
        if (original == null || original.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The uploaded file must have a filename.");
        }
        String leaf = original.replace('\\', '/');
        leaf = leaf.substring(leaf.lastIndexOf('/') + 1);
        leaf = Normalizer.normalize(leaf, Normalizer.Form.NFKC)
                .replaceAll("[\\p{Cntrl}]", "")
                .trim();
        if (leaf.isBlank() || leaf.length() > 255 || leaf.startsWith(".")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The uploaded filename is not valid.");
        }
        return leaf;
    }

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 1 || dot == filename.length() - 1) {
            throw unsupportedType();
        }
        String extension = filename.substring(dot + 1).toLowerCase(Locale.ROOT);
        if (!Set.of("pdf", "png", "jpg", "jpeg", "gif", "webp", "doc", "docx", "xls", "xlsx",
                "ppt", "pptx", "txt", "csv", "rtf").contains(extension)) {
            throw unsupportedType();
        }
        return extension;
    }

    private String mediaTypeFor(String extension) {
        return switch (extension) {
            case "pdf" -> "application/pdf";
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "gif" -> "image/gif";
            case "webp" -> "image/webp";
            case "doc" -> "application/msword";
            case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "xls" -> "application/vnd.ms-excel";
            case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "ppt" -> "application/vnd.ms-powerpoint";
            case "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case "txt" -> "text/plain; charset=UTF-8";
            case "csv" -> "text/csv; charset=UTF-8";
            case "rtf" -> "application/rtf";
            default -> throw unsupportedType();
        };
    }

    private boolean matchesFormat(String extension, byte[] bytes) {
        return switch (extension) {
            case "pdf" -> startsWith(bytes, "%PDF-".getBytes(StandardCharsets.US_ASCII));
            case "png" -> startsWith(bytes, new byte[]{(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a});
            case "jpg", "jpeg" -> startsWith(bytes, new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff});
            case "gif" -> startsWith(bytes, "GIF87a".getBytes(StandardCharsets.US_ASCII))
                    || startsWith(bytes, "GIF89a".getBytes(StandardCharsets.US_ASCII));
            case "webp" -> bytes.length >= 12 && startsWith(bytes, "RIFF".getBytes(StandardCharsets.US_ASCII))
                    && new String(bytes, 8, 4, StandardCharsets.US_ASCII).equals("WEBP");
            case "doc", "xls", "ppt" -> startsWith(bytes,
                    new byte[]{(byte) 0xd0, (byte) 0xcf, 0x11, (byte) 0xe0, (byte) 0xa1, (byte) 0xb1, 0x1a, (byte) 0xe1});
            case "docx" -> isOfficeZip(bytes, "word/document.xml");
            case "xlsx" -> isOfficeZip(bytes, "xl/workbook.xml");
            case "pptx" -> isOfficeZip(bytes, "ppt/presentation.xml");
            case "txt", "csv" -> isUtf8Text(bytes);
            case "rtf" -> startsWith(bytes, "{\\rtf".getBytes(StandardCharsets.US_ASCII));
            default -> false;
        };
    }

    private boolean isOfficeZip(byte[] bytes, String expectedPart) {
        if (bytes.length < 4 || bytes[0] != 'P' || bytes[1] != 'K') return false;
        try (ZipInputStream zip = new ZipInputStream(new java.io.ByteArrayInputStream(bytes))) {
            boolean contentTypes = false;
            boolean officePart = false;
            long expandedBytes = 0;
            java.util.zip.ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                contentTypes |= entry.getName().equals("[Content_Types].xml");
                officePart |= entry.getName().equals(expectedPart);
                byte[] buffer = new byte[8192];
                int count;
                while ((count = zip.read(buffer)) != -1) {
                    expandedBytes += count;
                    if (expandedBytes > MAX_OFFICE_EXPANDED_SIZE) return false;
                }
            }
            return contentTypes && officePart;
        } catch (IOException exception) {
            return false;
        }
    }

    private boolean isUtf8Text(byte[] bytes) {
        try {
            StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes));
            for (byte value : bytes) if (value == 0) return false;
            return true;
        } catch (java.nio.charset.CharacterCodingException exception) {
            return false;
        }
    }

    private boolean startsWith(byte[] value, byte[] prefix) {
        if (value.length < prefix.length) return false;
        for (int index = 0; index < prefix.length; index++) {
            if (value[index] != prefix[index]) return false;
        }
        return true;
    }

    private ResponseStatusException unsupportedType() {
        return new ResponseStatusException(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "Use a PDF, image, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV, or RTF file.");
    }

    public record ValidatedFile(String filename, String mediaType, byte[] bytes) {}
}
