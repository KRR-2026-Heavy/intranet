package co.krr.intranet.content;

import co.krr.intranet.content.PolicyDocumentFileValidator.ValidatedFile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Service
public class PolicyDocumentService {
    private static final String UNAVAILABLE =
            "Microsoft SQL Server is not configured; policy documents cannot be saved or published.";
    private static final String COLUMNS = """
            id, section, title, description, content, original_file_name, media_type,
            file_size, status, created_at, updated_at
            """;

    private final SqlServerConnectionProvider connections;
    private final PolicyDocumentFileValidator fileValidator;

    public PolicyDocumentService(
            SqlServerConnectionProvider connections,
            PolicyDocumentFileValidator fileValidator) {
        this.connections = connections;
        this.fileValidator = fileValidator;
    }

    public PolicyDocumentCollection adminCollection() {
        if (!connections.isConfigured()) return new PolicyDocumentCollection(false, List.of(), UNAVAILABLE);
        return new PolicyDocumentCollection(true, list(null, false), null);
    }

    public PolicyDocumentCollection published(String sectionSlug) {
        if (!connections.isConfigured()) return new PolicyDocumentCollection(false, List.of(), UNAVAILABLE);
        PolicyDocumentSection section = sectionSlug == null || sectionSlug.isBlank()
                ? null : PolicyDocumentSection.fromSlug(sectionSlug);
        return new PolicyDocumentCollection(true, list(section, true), null);
    }

    public PolicyDocument create(
            String sectionSlug,
            String title,
            String description,
            String content,
            String status,
            MultipartFile upload) {
        requireStorage();
        PolicyDocumentSection section = PolicyDocumentSection.fromSlug(sectionSlug);
        String validTitle = validateTitle(title);
        String validDescription = validateDescription(description);
        String validContent = validateContent(content);
        String validStatus = validateStatus(status);
        ValidatedFile file = (upload == null || upload.isEmpty()) ? null : fileValidator.validate(upload);
        if (validContent == null && file == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Enter written content or choose a file to upload.");
        }

        String sql = """
                INSERT INTO dbo.intranet_policy_document
                    (section, title, description, content, original_file_name, media_type, file_size,
                     status, file_data, created_at, updated_at)
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, SYSUTCDATETIME(), SYSUTCDATETIME())
                """;
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, section.slug());
            statement.setString(2, validTitle);
            statement.setString(3, validDescription);
            statement.setString(4, validContent);
            if (file == null) {
                statement.setNull(5, Types.NVARCHAR);
                statement.setNull(6, Types.NVARCHAR);
                statement.setNull(7, Types.BIGINT);
                statement.setString(8, validStatus);
                statement.setNull(9, Types.VARBINARY);
            } else {
                statement.setString(5, file.filename());
                statement.setString(6, file.mediaType());
                statement.setLong(7, file.bytes().length);
                statement.setString(8, validStatus);
                statement.setBytes(9, file.bytes());
            }
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("SQL Server did not return the policy document identifier.");
                return find(connection, result.getLong("id"));
            }
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public PolicyDocument update(
            long id,
            String sectionSlug,
            String title,
            String description,
            String content,
            String status,
            MultipartFile upload) {
        requireStorage();
        PolicyDocumentSection section = PolicyDocumentSection.fromSlug(sectionSlug);
        String validTitle = validateTitle(title);
        String validDescription = validateDescription(description);
        String validContent = validateContent(content);
        String validStatus = validateStatus(status);
        ValidatedFile replacement = upload == null || upload.isEmpty() ? null : fileValidator.validate(upload);

        try (Connection connection = connections.openConnection()) {
            PolicyDocument existing = findOrNotFound(connection, id);
            if (validContent == null && replacement == null && existing.originalFileName() == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Enter written content or choose a file to upload.");
            }
            String sql = replacement == null ? """
                    UPDATE dbo.intranet_policy_document
                    SET section = ?, title = ?, description = ?, content = ?, status = ?, updated_at = SYSUTCDATETIME()
                    WHERE id = ?
                    """ : """
                    UPDATE dbo.intranet_policy_document
                    SET section = ?, title = ?, description = ?, content = ?, status = ?,
                        original_file_name = ?, media_type = ?, file_size = ?, file_data = ?,
                        updated_at = SYSUTCDATETIME()
                    WHERE id = ?
                    """;
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                int index = 1;
                statement.setString(index++, section.slug());
                statement.setString(index++, validTitle);
                statement.setString(index++, validDescription);
                statement.setString(index++, validContent);
                statement.setString(index++, validStatus);
                if (replacement != null) {
                    statement.setString(index++, replacement.filename());
                    statement.setString(index++, replacement.mediaType());
                    statement.setLong(index++, replacement.bytes().length);
                    statement.setBytes(index++, replacement.bytes());
                }
                statement.setLong(index, id);
                if (statement.executeUpdate() == 0) throw notFound();
                return find(connection, id);
            }
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public PolicyDocument replaceFile(long id, MultipartFile upload) {
        requireStorage();
        ValidatedFile replacement = fileValidator.validate(upload);
        String sql = """
                UPDATE dbo.intranet_policy_document
                SET original_file_name = ?, media_type = ?, file_size = ?, file_data = ?,
                    updated_at = SYSUTCDATETIME()
                WHERE id = ?
                """;
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, replacement.filename());
            statement.setString(2, replacement.mediaType());
            statement.setLong(3, replacement.bytes().length);
            statement.setBytes(4, replacement.bytes());
            statement.setLong(5, id);
            if (statement.executeUpdate() == 0) throw notFound();
            return find(connection, id);
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public PolicyDocument updateStatus(long id, String status) {
        requireStorage();
        String validStatus = validateStatus(status);
        String sql = """
                UPDATE dbo.intranet_policy_document
                SET status = ?, updated_at = SYSUTCDATETIME()
                WHERE id = ?
                """;
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, validStatus);
            statement.setLong(2, id);
            if (statement.executeUpdate() == 0) throw notFound();
            return find(connection, id);
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public void delete(long id) {
        requireStorage();
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "DELETE FROM dbo.intranet_policy_document WHERE id = ?")) {
            statement.setLong(1, id);
            if (statement.executeUpdate() == 0) throw notFound();
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public StoredFile file(long id, boolean publishedOnly) {
        requireStorage();
        String sql = "SELECT " + COLUMNS + ", file_data FROM dbo.intranet_policy_document WHERE id = ?"
                + (publishedOnly ? " AND status = 'PUBLISHED'" : "");
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, id);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw notFound();
                byte[] bytes = result.getBytes("file_data");
                if (bytes == null) {
                    throw new ResponseStatusException(HttpStatus.NOT_FOUND, "This document does not have an uploaded file.");
                }
                return new StoredFile(readDocument(result), bytes);
            }
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    private List<PolicyDocument> list(PolicyDocumentSection section, boolean publishedOnly) {
        String sql = "SELECT " + COLUMNS + " FROM dbo.intranet_policy_document WHERE 1=1"
                + (publishedOnly ? " AND status = 'PUBLISHED'" : "")
                + (section == null ? "" : " AND section = ?")
                + " ORDER BY section, created_at DESC, id DESC";
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            if (section != null) statement.setString(1, section.slug());
            try (ResultSet results = statement.executeQuery()) {
                List<PolicyDocument> documents = new ArrayList<>();
                while (results.next()) documents.add(readDocument(results));
                return List.copyOf(documents);
            }
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    private PolicyDocument find(Connection connection, long id) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT " + COLUMNS + " FROM dbo.intranet_policy_document WHERE id = ?")) {
            statement.setLong(1, id);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Policy document was not available after the write.");
                return readDocument(result);
            }
        }
    }

    private PolicyDocument findOrNotFound(Connection connection, long id) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT " + COLUMNS + " FROM dbo.intranet_policy_document WHERE id = ?")) {
            statement.setLong(1, id);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw notFound();
                return readDocument(result);
            }
        }
    }

    private PolicyDocument readDocument(ResultSet result) throws SQLException {
        Number fileSizeNumber = (Number) result.getObject("file_size");
        return new PolicyDocument(
                result.getLong("id"),
                result.getString("section"),
                result.getString("title"),
                result.getString("description"),
                result.getString("content"),
                result.getString("original_file_name"),
                result.getString("media_type"),
                fileSizeNumber == null ? null : fileSizeNumber.longValue(),
                result.getString("status"),
                readDateTime(result, "created_at"),
                readDateTime(result, "updated_at"));
    }

    private OffsetDateTime readDateTime(ResultSet result, String column) throws SQLException {
        LocalDateTime value = result.getObject(column, LocalDateTime.class);
        return value == null ? null : value.atOffset(ZoneOffset.UTC);
    }

    private String validateTitle(String title) {
        if (title == null || title.isBlank() || title.trim().length() > 250) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a document title up to 250 characters.");
        }
        return title.trim();
    }

    private String validateDescription(String description) {
        if (description != null && description.trim().length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Descriptions cannot exceed 2,000 characters.");
        }
        return description == null || description.isBlank() ? null : description.trim();
    }

    private String validateContent(String content) {
        if (content != null && content.trim().length() > 200000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Written content cannot exceed 200,000 characters.");
        }
        return content == null || content.isBlank() ? null : content.trim();
    }

    private String validateStatus(String status) {
        String normalized = status == null ? "" : status.trim().toUpperCase();
        if (!List.of("DRAFT", "PUBLISHED").contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose draft or publish.");
        }
        return normalized;
    }

    private void requireStorage() {
        if (!connections.isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, UNAVAILABLE);
        }
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy document not found.");
    }

    private ResponseStatusException storageFailure(SQLException exception) {
        String message = exception.getErrorCode() == 208 || exception.getErrorCode() == 229 || exception.getErrorCode() == 207
                ? "Policy document storage needs database migration. Run "
                        + "backend/sql/migrate-policy-document-content.sql with a database owner account."
                : UNAVAILABLE;
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, message, exception);
    }

    public record PolicyDocument(
            long id,
            String section,
            String title,
            String description,
            String content,
            String originalFileName,
            String mediaType,
            Long fileSize,
            String status,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {}

    public record PolicyDocumentCollection(
            boolean storageConfigured,
            List<PolicyDocument> items,
            String unavailableMessage) {}

    public record StoredFile(PolicyDocument document, byte[] bytes) {}
}
