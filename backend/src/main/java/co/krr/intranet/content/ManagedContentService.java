package co.krr.intranet.content;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ManagedContentService {
    private static final String STORAGE_UNAVAILABLE =
            "Microsoft SQL Server is not configured; content cannot be saved or published.";
    private static final String SELECT_COLUMNS = """
            id, content_type, title, body, status, scheduled_at, published_at,
            announcement_date, expires_on, thought_month,
            department, priority, pinned, author, event_date, event_time, location,
            effective_date, created_at, updated_at
            """;

    private final SqlServerConnectionProvider connections;

    public ManagedContentService(SqlServerConnectionProvider connections) {
        this.connections = connections;
    }

    public boolean isConfigured() {
        return connections.isConfigured();
    }

    public String unavailableMessage() {
        return STORAGE_UNAVAILABLE;
    }

    public List<ManagedContent> list(ManagedContentType type) {
        if (!isConfigured()) return List.of();
        String sql = "SELECT " + SELECT_COLUMNS
                + " FROM dbo.intranet_content WHERE content_type = ? ORDER BY created_at DESC, id DESC";
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            publishDue(connection, type);
            statement.setString(1, type.slug());
            try (ResultSet results = statement.executeQuery()) {
                return readItems(results);
            }
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public List<ManagedContent> published(ManagedContentType type) {
        // Null distinguishes missing SQL configuration from an empty published collection.
        if (!isConfigured()) return null;
        String sql = "SELECT " + SELECT_COLUMNS + """
                 FROM dbo.intranet_content
                 WHERE content_type = ?
                   AND (status = 'PUBLISHED'
                        OR (content_type <> 'thoughts'
                            AND status = 'SCHEDULED'
                            AND scheduled_at <= SYSUTCDATETIME()))
                   AND (content_type <> 'announcements'
                        OR expires_on IS NULL
                        OR expires_on >= ?)
                 ORDER BY COALESCE(published_at, scheduled_at) DESC, id DESC
                """;
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            if (type == ManagedContentType.ANNOUNCEMENTS || type == ManagedContentType.THOUGHTS) {
                publishDue(connection, type);
            }
            statement.setString(1, type.slug());
            statement.setDate(2, java.sql.Date.valueOf(LocalDate.now()));
            try (ResultSet results = statement.executeQuery()) {
                return readItems(results);
            }
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public ManagedContent create(ManagedContentType type, ManagedContent.Request request) {
        requireStorage();
        validateRequest(type, request);
        String sql = """
                INSERT INTO dbo.intranet_content
                    (content_type, title, body, status, scheduled_at, published_at,
                     announcement_date, expires_on, thought_month,
                     department, priority, pinned, author, event_date, event_time,
                     location, effective_date, created_at, updated_at)
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 'PUBLISHED' THEN SYSUTCDATETIME() ELSE NULL END,
                        ?, ?, ?,
                        ?, ?, ?, ?, ?, ?, ?, ?, SYSUTCDATETIME(), SYSUTCDATETIME())
                """;
        try (Connection connection = connections.openConnection()) {
            ensureThoughtMonthAvailable(connection, type, request, 0L);
            ensureHolidayIsUnique(connection, type, request, 0L);
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                bindRequest(statement, type, request);
                try (ResultSet result = statement.executeQuery()) {
                    if (!result.next()) {
                        throw new SQLException("SQL Server did not return the new content identifier.");
                    }
                    return find(connection, type, result.getLong("id"));
                }
            }
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public ManagedContent update(
            ManagedContentType type,
            long id,
            ManagedContent.Request request) {
        requireStorage();
        validateRequest(type, request);
        String sql = """
                UPDATE dbo.intranet_content
                SET title = ?, body = ?, status = ?, scheduled_at = ?,
                    published_at = CASE WHEN ? = 'PUBLISHED' THEN SYSUTCDATETIME() ELSE NULL END,
                    announcement_date = ?, expires_on = ?, thought_month = ?,
                    department = ?, priority = ?, pinned = ?, author = ?, event_date = ?,
                    event_time = ?, location = ?, effective_date = ?, updated_at = SYSUTCDATETIME()
                WHERE id = ? AND content_type = ?
                """;
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            ensureThoughtMonthAvailable(connection, type, request, id);
            ensureHolidayIsUnique(connection, type, request, id);
            int index = bindFields(statement, request, 1);
            statement.setLong(index++, id);
            statement.setString(index, type.slug());
            if (statement.executeUpdate() == 0) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Content item not found.");
            }
            return find(connection, type, id);
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public void delete(ManagedContentType type, long id) {
        requireStorage();
        String sql = "DELETE FROM dbo.intranet_content WHERE id = ? AND content_type = ?";
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, id);
            statement.setString(2, type.slug());
            if (statement.executeUpdate() == 0) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Content item not found.");
            }
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public Map<String, CategoryCounts> counts() {
        Map<String, CategoryCounts> counts = new LinkedHashMap<>();
        for (ManagedContentType type : ManagedContentType.values()) {
            if (!isConfigured()) {
                counts.put(type.slug(), new CategoryCounts(null, null, null));
                continue;
            }
            List<ManagedContent> items = list(type);
            long published = items.stream().filter(item -> item.status().equals("PUBLISHED")).count();
            long drafts = items.stream().filter(item -> item.status().equals("DRAFT")).count();
            long scheduled = items.stream().filter(item -> item.status().equals("SCHEDULED")).count();
            counts.put(type.slug(), new CategoryCounts(published, drafts, scheduled));
        }
        return counts;
    }

    private ManagedContent find(Connection connection, ManagedContentType type, long id) throws SQLException {
        String sql = "SELECT " + SELECT_COLUMNS
                + " FROM dbo.intranet_content WHERE id = ? AND content_type = ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, id);
            statement.setString(2, type.slug());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) {
                    throw new SQLException("Content item was not available after the write.");
                }
                return readItem(result);
            }
        }
    }

    private List<ManagedContent> readItems(ResultSet results) throws SQLException {
        List<ManagedContent> items = new ArrayList<>();
        while (results.next()) {
            items.add(readItem(results));
        }
        return items;
    }

    private ManagedContent readItem(ResultSet result) throws SQLException {
        return new ManagedContent(
                result.getLong("id"),
                result.getString("content_type"),
                result.getString("title"),
                result.getString("body"),
                result.getString("status"),
                readDateTime(result, "scheduled_at"),
                readDateTime(result, "published_at"),
                result.getObject("announcement_date", LocalDate.class),
                result.getObject("expires_on", LocalDate.class),
                result.getObject("thought_month", LocalDate.class),
                result.getString("department"),
                result.getString("priority"),
                result.getBoolean("pinned"),
                result.getString("author"),
                result.getObject("event_date", LocalDate.class),
                result.getString("event_time"),
                result.getString("location"),
                result.getObject("effective_date", LocalDate.class),
                readDateTime(result, "created_at"),
                readDateTime(result, "updated_at"));
    }

    private OffsetDateTime readDateTime(ResultSet result, String column) throws SQLException {
        LocalDateTime value = result.getObject(column, LocalDateTime.class);
        return value == null ? null : value.atOffset(ZoneOffset.UTC);
    }

    private void bindRequest(
            PreparedStatement statement,
            ManagedContentType type,
            ManagedContent.Request request) throws SQLException {
        statement.setString(1, type.slug());
        bindFields(statement, request, 2);
    }

    private int bindFields(
            PreparedStatement statement,
            ManagedContent.Request request,
            int start) throws SQLException {
        int index = start;
        statement.setString(index++, request.title().trim());
        statement.setString(index++, request.body().trim());
        String status = request.status().toUpperCase();
        statement.setString(index++, status);
        statement.setTimestamp(index++, asUtcTimestamp(request.scheduledAt()));
        statement.setString(index++, status);
        statement.setObject(index++, request.announcementDate());
        statement.setObject(index++, request.expiresOn());
        statement.setObject(index++, request.thoughtMonth());
        statement.setString(index++, blankToNull(request.department()));
        statement.setString(index++, request.priority() == null || request.priority().isBlank()
                ? "NORMAL" : request.priority().toUpperCase());
        statement.setBoolean(index++, request.pinned());
        statement.setString(index++, blankToNull(request.author()));
        statement.setObject(index++, request.eventDate());
        statement.setString(index++, blankToNull(request.time()));
        statement.setString(index++, blankToNull(request.location()));
        statement.setObject(index++, request.effectiveDate());
        return index;
    }

    private Timestamp asUtcTimestamp(OffsetDateTime value) {
        return value == null ? null : Timestamp.valueOf(value.withOffsetSameInstant(ZoneOffset.UTC)
                .toLocalDateTime());
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void validateRequest(ManagedContentType type, ManagedContent.Request request) {
        String status = request.status() == null ? "" : request.status().toUpperCase();
        if (!List.of("DRAFT", "PUBLISHED", "SCHEDULED").contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose draft, publish, or schedule.");
        }
        if (status.equals("SCHEDULED")) {
            if (request.scheduledAt() == null
                    || !request.scheduledAt().isAfter(OffsetDateTime.now())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Choose a future date and time to schedule this content.");
            }
        } else if (request.scheduledAt() != null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A scheduled date is only valid for scheduled content.");
        }
        if (type == ManagedContentType.ANNOUNCEMENTS) {
            if (request.announcementDate() == null || request.expiresOn() == null) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Announcements require an announcement date and expiry date.");
            }
            if (request.expiresOn().isBefore(request.announcementDate())) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The expiry date cannot be before the announcement date.");
            }
            if (!status.equals("DRAFT")) {
                LocalDate activeFrom = request.scheduledAt() == null
                    ? LocalDate.now()
                    : request.scheduledAt().toInstant()
                            .atZone(java.time.ZoneId.systemDefault())
                            .toLocalDate();
                if (request.expiresOn().isBefore(activeFrom)) {
                    throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "The expiry date must be today or later than the scheduled publish date.");
                }
            }
            if (!List.of("LOW", "NORMAL", "HIGH", "URGENT")
                    .contains(request.priority() == null ? "NORMAL" : request.priority().toUpperCase())) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Choose a valid announcement priority.");
            }
        }
        if (type == ManagedContentType.THOUGHTS && request.thoughtMonth() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Choose the month and year for this thought.");
        }
        if (type == ManagedContentType.HOLIDAYS
                && !status.equals("DRAFT")
                && request.eventDate() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Published or scheduled holidays require an official holiday date.");
        }
    }

    private void ensureThoughtMonthAvailable(
            Connection connection,
            ManagedContentType type,
            ManagedContent.Request request,
            long excludedId) throws SQLException {
        if (type != ManagedContentType.THOUGHTS || !request.status().equalsIgnoreCase("PUBLISHED")) return;
        String sql = """
                SELECT COUNT(*) AS matches
                FROM dbo.intranet_content
                WHERE content_type = 'thoughts'
                  AND thought_month = ?
                  AND status = 'PUBLISHED'
                  AND id <> ?
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, request.thoughtMonth());
            statement.setLong(2, excludedId);
            try (ResultSet result = statement.executeQuery()) {
                if (result.next() && result.getLong("matches") > 0) {
                    throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Only one thought may be published for that month.");
                }
            }
        }
    }

    private void ensureHolidayIsUnique(
            Connection connection,
            ManagedContentType type,
            ManagedContent.Request request,
            long excludedId) throws SQLException {
        if (type != ManagedContentType.HOLIDAYS || request.eventDate() == null) {
            return;
        }
        String sql = """
                SELECT COUNT(*) AS matches
                FROM dbo.intranet_content
                WHERE content_type = 'holidays'
                  AND LOWER(LTRIM(RTRIM(title))) = LOWER(?)
                  AND event_date = ?
                  AND id <> ?
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, request.title().trim());
            statement.setObject(2, request.eventDate());
            statement.setLong(3, excludedId);
            try (ResultSet result = statement.executeQuery()) {
                if (result.next() && result.getLong("matches") > 0) {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "A holiday with the same name and date already exists.");
                }
            }
        }
    }

    private void publishDue(Connection connection, ManagedContentType type) throws SQLException {
        if (type == ManagedContentType.THOUGHTS) {
            publishDueThoughts(connection);
            return;
        }
        String sql = """
                UPDATE dbo.intranet_content
                SET status = 'PUBLISHED',
                    published_at = COALESCE(published_at, scheduled_at),
                    updated_at = SYSUTCDATETIME()
                WHERE content_type = ?
                  AND status = 'SCHEDULED'
                  AND scheduled_at <= SYSUTCDATETIME()
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, type.slug());
            statement.executeUpdate();
        }
    }

    private void publishDueThoughts(Connection connection) throws SQLException {
        String sql = """
                WITH next_due AS (
                    SELECT TOP (1) scheduled.id
                    FROM dbo.intranet_content AS scheduled
                    WHERE scheduled.content_type = 'thoughts'
                      AND scheduled.status = 'SCHEDULED'
                      AND scheduled.scheduled_at <= SYSUTCDATETIME()
                      AND NOT EXISTS (
                          SELECT 1
                          FROM dbo.intranet_content AS published
                          WHERE published.content_type = 'thoughts'
                            AND published.status = 'PUBLISHED'
                            AND published.thought_month = scheduled.thought_month
                      )
                    ORDER BY scheduled.scheduled_at, scheduled.id
                )
                UPDATE content
                SET status = 'PUBLISHED',
                    published_at = COALESCE(content.published_at, content.scheduled_at),
                    updated_at = SYSUTCDATETIME()
                FROM dbo.intranet_content AS content
                INNER JOIN next_due ON next_due.id = content.id
                """;
        int updated;
        do {
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                updated = statement.executeUpdate();
            }
        } while (updated > 0);
    }

    private void requireStorage() {
        if (!isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, STORAGE_UNAVAILABLE);
        }
    }

    private ResponseStatusException storageFailure(SQLException exception) {
        if (exception.getErrorCode() == 2601 || exception.getErrorCode() == 2627) {
            return new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only one thought may be published for that month.",
                    exception);
        }
        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "SQL Server content storage is currently unavailable.",
                exception);
    }

    public record CategoryCounts(Long published, Long drafts, Long scheduled) {
    }
}
