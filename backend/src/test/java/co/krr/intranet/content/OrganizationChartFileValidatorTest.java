package co.krr.intranet.content;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class OrganizationChartFileValidatorTest {
    private final OrganizationChartFileValidator validator = new OrganizationChartFileValidator();

    @Test
    void acceptsPdfAndUsesOnlyTheSafeFilename() throws Exception {
        var upload = new MockMultipartFile("file", "folder\\chart.pdf", "application/pdf",
                "%PDF-1.7\nchart\n%%EOF".getBytes());

        var validated = validator.validate(upload);

        assertEquals("chart.pdf", validated.filename());
        assertEquals(upload.getBytes().length, validated.content().length);
    }

    @Test
    void rejectsNonPdfAndOversizedFiles() {
        var nonPdf = new MockMultipartFile("file", "chart.txt", "text/plain", "plain text".getBytes());
        var oversized = new MockMultipartFile("file", "large.pdf", "application/pdf",
                new byte[(int) OrganizationChartFileValidator.MAX_FILE_SIZE + 1]);

        assertEquals(415, assertThrows(ResponseStatusException.class, () -> validator.validate(nonPdf))
                .getStatusCode().value());
        assertEquals(413, assertThrows(ResponseStatusException.class, () -> validator.validate(oversized))
                .getStatusCode().value());
    }
}
