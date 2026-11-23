package co.krr.intranet.employee;

import co.krr.intranet.content.ManagedContent;
import co.krr.intranet.content.ManagedContentService;
import co.krr.intranet.content.ManagedContentType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class EmployeePolicyCollectionTest {
    @Test
    void employeePolicyResponseIncludesAllPublishedPolicies() {
        ManagedContentService contentService = mock(ManagedContentService.class);
        when(contentService.published(ManagedContentType.POLICIES)).thenReturn(List.of(
                policy(1, "Privacy Policy", "Privacy details", LocalDate.of(2026, 1, 1)),
                policy(2, "Safety Policy", "Safety details", LocalDate.of(2026, 2, 1))));

        EmployeeContentController.Policy response = new EmployeeContentController(
                mock(co.krr.intranet.people.EmployeeManagementService.class),
                contentService).policy();

        assertEquals(2, response.sections().size());
        assertEquals("Privacy Policy", response.sections().get(0).title());
        assertEquals("2026-01-01", response.effectiveDate());
        assertEquals("2026-02-01", response.sections().get(1).effectiveDate());
    }

    private ManagedContent policy(long id, String title, String body, LocalDate effectiveDate) {
        OffsetDateTime timestamp = OffsetDateTime.parse("2026-01-01T00:00:00Z");
        return new ManagedContent(
                id,
                "policies",
                title,
                body,
                "PUBLISHED",
                null,
                null,
                null,
                null,
                null,
                null,
                "NORMAL",
                false,
                null,
                null,
                null,
                null,
                effectiveDate,
                timestamp,
                timestamp);
    }
}
