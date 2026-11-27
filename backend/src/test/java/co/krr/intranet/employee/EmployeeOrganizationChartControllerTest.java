package co.krr.intranet.employee;

import com.fasterxml.jackson.databind.ObjectMapper;
import co.krr.intranet.content.OrganizationChartFileValidator;
import co.krr.intranet.content.OrganizationChartStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.MediaType;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.nio.file.Path;

class EmployeeOrganizationChartControllerTest {
    @TempDir
    Path storageDirectory;

    private EmployeeOrganizationChartController controller;

    @BeforeEach
    void setUp() {
        var storage = new OrganizationChartStorageService(
                storageDirectory.toString(), new ObjectMapper(), new OrganizationChartFileValidator());
        controller = new EmployeeOrganizationChartController(storage);
    }

    @Test
    void servesBothOriginalChartsAsInlinePdf() {
        for (int number = 1; number <= 2; number++) {
            var response = controller.chart(number, false);
            byte[] content = response.getBody();

            assertEquals(MediaType.APPLICATION_PDF, response.getHeaders().getContentType());
            assertTrue(response.getHeaders().getContentDisposition().isInline());
            assertTrue(content != null && content.length > 5);
            assertEquals('%', (char) content[0]);
            assertEquals('P', (char) content[1]);
            assertEquals('D', (char) content[2]);
            assertEquals('F', (char) content[3]);
        }
    }

    @Test
    void rejectsChartNumbersOutsideTheTwoProvidedFiles() {
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> controller.chart(0, false))
                .getStatusCode().value());
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> controller.chart(3, false))
                .getStatusCode().value());
    }
}
