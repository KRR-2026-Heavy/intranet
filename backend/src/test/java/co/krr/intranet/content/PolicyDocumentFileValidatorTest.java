package co.krr.intranet.content;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PolicyDocumentFileValidatorTest {
    private final PolicyDocumentFileValidator validator = new PolicyDocumentFileValidator();

    @Test
    void acceptsPdfAndSanitizesWindowsPathFromFilename() {
        var file = validator.validate(new MockMultipartFile(
                "file", "C:\\fakepath\\safety-policy.pdf", "application/octet-stream", "%PDF-1.7 sample".getBytes()));

        assertEquals("safety-policy.pdf", file.filename());
        assertEquals("application/pdf", file.mediaType());
    }

    @Test
    void acceptsRasterImageAndLegacyWordDocumentSignatures() {
        var image = validator.validate(new MockMultipartFile(
                "file", "chart.png", "image/png", new byte[]{(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}));
        var document = validator.validate(new MockMultipartFile(
                "file", "procedure.doc", "application/msword",
                new byte[]{(byte) 0xd0, (byte) 0xcf, 0x11, (byte) 0xe0, (byte) 0xa1, (byte) 0xb1, 0x1a, (byte) 0xe1}));

        assertEquals("image/png", image.mediaType());
        assertEquals("application/msword", document.mediaType());
    }

    @Test
    void acceptsOfficeOpenXmlWithExpectedDocumentPart() throws Exception {
        var file = validator.validate(new MockMultipartFile(
                "file", "committee-minutes.docx", "application/zip", officeZip("word/document.xml")));

        assertEquals("application/vnd.openxmlformats-officedocument.wordprocessingml.document", file.mediaType());
    }

    @Test
    void rejectsMismatchedSignaturesUnsupportedTypesAndOversizedFiles() {
        assertThrows(ResponseStatusException.class, () -> validator.validate(new MockMultipartFile(
                "file", "policy.pdf", "application/pdf", "not a pdf".getBytes())));
        assertThrows(ResponseStatusException.class, () -> validator.validate(new MockMultipartFile(
                "file", "policy.exe", "application/octet-stream", new byte[]{1, 2, 3})));
        assertThrows(ResponseStatusException.class, () -> validator.validate(new MockMultipartFile(
                "file", "large.pdf", "application/pdf", new byte[(int) PolicyDocumentFileValidator.MAX_FILE_SIZE + 1])));
    }

    private byte[] officeZip(String officePart) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            zip.putNextEntry(new ZipEntry("[Content_Types].xml"));
            zip.write("<Types/>".getBytes());
            zip.closeEntry();
            zip.putNextEntry(new ZipEntry(officePart));
            zip.write("document".getBytes());
            zip.closeEntry();
        }
        return bytes.toByteArray();
    }
}
