package co.krr.intranet.content;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ManagedContentServiceTest {
    private SqlServerConnectionProvider connections;
    private ManagedContentService service;

    @BeforeEach
    void setUp() {
        connections = mock(SqlServerConnectionProvider.class);
        service = new ManagedContentService(connections);
    }

    @Test
    void announcementRequiresAnnouncementAndExpiryDates() throws Exception {
        when(connections.isConfigured()).thenReturn(true);
        ManagedContent.Request request = request(
                "DRAFT",
                null,
                null,
                null,
                null);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.create(ManagedContentType.ANNOUNCEMENTS, request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(connections, never()).openConnection();
    }

    @Test
    void announcementExpiryCannotPrecedeAnnouncementDate() throws Exception {
        when(connections.isConfigured()).thenReturn(true);
        ManagedContent.Request request = request(
                "DRAFT",
                LocalDate.of(2026, 11, 21),
                LocalDate.of(2026, 11, 20),
                null,
                null);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.create(ManagedContentType.ANNOUNCEMENTS, request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(connections, never()).openConnection();
    }

    @Test
    void cannotPublishAnAlreadyExpiredAnnouncement() throws Exception {
        when(connections.isConfigured()).thenReturn(true);
        LocalDate yesterday = LocalDate.now().minusDays(1);
        ManagedContent.Request request = request(
                "PUBLISHED",
                yesterday,
                yesterday,
                null,
                null);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.create(ManagedContentType.ANNOUNCEMENTS, request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(connections, never()).openConnection();
    }

    @Test
    void thoughtRequiresAMonthAndYear() throws Exception {
        when(connections.isConfigured()).thenReturn(true);
        ManagedContent.Request request = request("DRAFT", null, null, null, null);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.create(ManagedContentType.THOUGHTS, request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(connections, never()).openConnection();
    }

    @Test
    void rejectsAnotherPublishedThoughtForTheSameMonth() throws Exception {
        when(connections.isConfigured()).thenReturn(true);
        Connection connection = mock(Connection.class);
        PreparedStatement conflictQuery = mock(PreparedStatement.class);
        PreparedStatement insertStatement = mock(PreparedStatement.class);
        ResultSet results = mock(ResultSet.class);
        when(connections.openConnection()).thenReturn(connection);
        when(connection.prepareStatement(contains("SELECT COUNT(*) AS matches"))).thenReturn(conflictQuery);
        when(connection.prepareStatement(contains("INSERT INTO"))).thenReturn(insertStatement);
        when(conflictQuery.executeQuery()).thenReturn(results);
        when(results.next()).thenReturn(true);
        when(results.getLong("matches")).thenReturn(1L);

        ManagedContent.Request request = request(
                "PUBLISHED",
                null,
                null,
                LocalDate.of(2026, 11, 1),
                null);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.create(ManagedContentType.THOUGHTS, request));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        verify(insertStatement, never()).executeQuery();
    }

    @Test
    void publishedHolidayRequiresAnOfficialDate() throws Exception {
        when(connections.isConfigured()).thenReturn(true);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.create(
                        ManagedContentType.HOLIDAYS,
                        holidayRequest("PUBLISHED", null)));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(connections, never()).openConnection();
    }

    @Test
    void rejectsAnotherPublishedHolidayWithTheSameNameAndDate() throws Exception {
        when(connections.isConfigured()).thenReturn(true);
        Connection connection = mock(Connection.class);
        PreparedStatement duplicateQuery = mock(PreparedStatement.class);
        ResultSet results = mock(ResultSet.class);
        when(connections.openConnection()).thenReturn(connection);
        when(connection.prepareStatement(contains("SELECT COUNT(*) AS matches"))).thenReturn(duplicateQuery);
        when(duplicateQuery.executeQuery()).thenReturn(results);
        when(results.next()).thenReturn(true);
        when(results.getLong("matches")).thenReturn(1L);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.create(
                        ManagedContentType.HOLIDAYS,
                        holidayRequest("PUBLISHED", LocalDate.of(2026, 8, 15))));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        verify(connection, never()).prepareStatement(contains("INSERT INTO"));
    }

    @Test
    void normalizesAuthorNamesForNewAndExistingContent() {
        ManagedContent.Request request = new ManagedContent.Request(
                "Title",
                "Description",
                "DRAFT",
                null,
                null,
                null,
                null,
                null,
                "NORMAL",
                false,
                "Sathishkumar C.",
                null,
                null,
                null,
                null);
        ManagedContent existing = new ManagedContent(
                1L,
                "thoughts",
                "Title",
                "Description",
                "PUBLISHED",
                null,
                null,
                null,
                null,
                null,
                null,
                "NORMAL",
                false,
                "Kumar R",
                null,
                null,
                null,
                null,
                null,
                null);

        assertEquals("Sathishkumar.C", request.author());
        assertEquals("Kumar.R", existing.author());
    }

    private ManagedContent.Request request(
            String status,
            LocalDate announcementDate,
            LocalDate expiresOn,
            LocalDate thoughtMonth,
            OffsetDateTime scheduledAt) {
        return new ManagedContent.Request(
                "Title",
                "Description",
                status,
                scheduledAt,
                announcementDate,
                expiresOn,
                thoughtMonth,
                "Engineering",
                "NORMAL",
                false,
                "Author",
                null,
                null,
                null,
                null);
    }

    private ManagedContent.Request holidayRequest(String status, LocalDate eventDate) {
        return new ManagedContent.Request(
                "Independence Day",
                "Company holiday",
                status,
                null,
                null,
                null,
                null,
                null,
                "NORMAL",
                false,
                null,
                eventDate,
                null,
                null,
                null);
    }
}
