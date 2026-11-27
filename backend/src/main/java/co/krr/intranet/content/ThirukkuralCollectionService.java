package co.krr.intranet.content;

import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Service
public class ThirukkuralCollectionService {
    private static final ZoneId INDIA_ZONE = ZoneId.of("Asia/Kolkata");
    private final SqlServerConnectionProvider connections;

    public ThirukkuralCollectionService(SqlServerConnectionProvider connections) {
        this.connections = connections;
    }

    public boolean isConfigured() {
        return connections.isConfigured();
    }

    public AdminCollection adminCollection() throws SQLException {
        if (!isConfigured()) return new AdminCollection(false, false, false, null, 0, List.of());
        if (!tableExists("dbo.intranet_thirukkural_daily_couplet")) {
            return new AdminCollection(true, false, false, null, 0, List.of());
        }
        try (Connection connection = connections.openConnection();
             PreparedStatement state = connection.prepareStatement("""
                     SELECT is_published FROM dbo.intranet_thirukkural_collection WHERE collection_id = 1
                     """)) {
            boolean published;
            try (ResultSet result = state.executeQuery()) {
                if (!result.next()) return new AdminCollection(true, true, false, null, 0, List.of());
                published = result.getBoolean(1);
            }
            if (!published) return new AdminCollection(true, true, false, null, 0, List.of());

            List<KuralText> couplets = new ArrayList<>(10);
            LocalDate startDate = null;
            try (PreparedStatement select = connection.prepareStatement("""
                    SELECT kural_number, line1, line2, start_date
                    FROM dbo.intranet_thirukkural_daily_couplet
                    WHERE collection_id = 1
                    ORDER BY kural_number
                    """); ResultSet result = select.executeQuery()) {
                while (result.next()) {
                    int number = result.getInt("kural_number");
                    LocalDate rowStartDate = result.getObject("start_date", LocalDate.class);
                    if (startDate == null) startDate = rowStartDate;
                    couplets.add(new KuralText(number, result.getString("line1"), result.getString("line2")));
                }
            }
            int current = startDate == null ? 0 : ThirukkuralCalendar.kuralNumber(startDate, todayInIndia());
            return new AdminCollection(true, true, couplets.size() == 10, startDate, current, List.copyOf(couplets));
        }
    }

    public EmployeeCouplet currentCouplet() throws SQLException {
        if (!isConfigured()) return null;
        try (Connection connection = connections.openConnection();
             PreparedStatement collectionState = connection.prepareStatement("""
                     SELECT is_published FROM dbo.intranet_thirukkural_collection WHERE collection_id = 1
                     """)) {
            try (ResultSet state = collectionState.executeQuery()) {
                if (!state.next() || !state.getBoolean(1)) return null;
            }
            try (PreparedStatement selectStart = connection.prepareStatement("""
                    SELECT TOP (1) d.start_date
                    FROM dbo.intranet_thirukkural_daily_couplet d
                    JOIN dbo.intranet_thirukkural_collection c ON c.collection_id = d.collection_id
                    WHERE d.collection_id = 1 AND c.is_published = 1
                    ORDER BY d.kural_number
                    """)) {
                LocalDate startDate;
                try (ResultSet result = selectStart.executeQuery()) {
                    if (!result.next()) return null;
                    startDate = result.getObject("start_date", LocalDate.class);
                }
                LocalDate today = todayInIndia();
                int currentNumber = ThirukkuralCalendar.kuralNumber(startDate, today);
                try (PreparedStatement select = connection.prepareStatement("""
                        SELECT line1, line2
                        FROM dbo.intranet_thirukkural_daily_couplet
                        WHERE collection_id = 1 AND kural_number = ? AND start_date = ?
                        """)) {
                    select.setInt(1, currentNumber);
                    select.setObject(2, startDate);
                    try (ResultSet result = select.executeQuery()) {
                        if (!result.next()) return null;
                        return new EmployeeCouplet(currentNumber, result.getString("line1"),
                                result.getString("line2"), startDate,
                                today.plusDays(1).atStartOfDay(INDIA_ZONE).toOffsetDateTime().toString());
                    }
                }
            }
        }
    }

    public AdminCollection publish(List<KuralText> couplets) throws SQLException {
        if (!isConfigured()) throw new IllegalStateException("SQL Server is not configured.");
        validateCollection(couplets);
        LocalDate startDate = todayInIndia();
        try (Connection connection = connections.openConnection()) {
            connection.setAutoCommit(false);
            try {
                try (PreparedStatement delete = connection.prepareStatement(
                        "DELETE FROM dbo.intranet_thirukkural_daily_couplet WHERE collection_id = 1")) {
                    delete.executeUpdate();
                }
                try (PreparedStatement state = connection.prepareStatement("""
                        MERGE dbo.intranet_thirukkural_collection AS target
                        USING (SELECT CAST(1 AS TINYINT) AS collection_id) AS source
                        ON target.collection_id = source.collection_id
                        WHEN MATCHED THEN UPDATE SET is_published = 1, current_index = 0,
                            published_at_epoch_ms = ?, next_advance_at_epoch_ms = NULL, updated_at = SYSUTCDATETIME()
                        WHEN NOT MATCHED THEN INSERT
                            (collection_id, is_published, current_index, published_at_epoch_ms, next_advance_at_epoch_ms)
                            VALUES (1, 1, 0, ?, NULL);
                        """)) {
                    long publishedAt = startDate.atStartOfDay(INDIA_ZONE).toInstant().toEpochMilli();
                    state.setLong(1, publishedAt);
                    state.setLong(2, publishedAt);
                    state.executeUpdate();
                }
                try (PreparedStatement insert = connection.prepareStatement("""
                        INSERT INTO dbo.intranet_thirukkural_daily_couplet
                            (collection_id, kural_number, line1, line2, start_date)
                        VALUES (1, ?, ?, ?, ?)
                        """)) {
                    for (KuralText couplet : couplets) {
                        insert.setInt(1, couplet.kuralNumber());
                        insert.setNString(2, couplet.line1());
                        insert.setNString(3, couplet.line2());
                        insert.setObject(4, startDate);
                        insert.addBatch();
                    }
                    insert.executeBatch();
                }
                connection.commit();
            } catch (SQLException | RuntimeException exception) {
                connection.rollback();
                throw exception;
            } finally {
                connection.setAutoCommit(true);
            }
        }
        return adminCollection();
    }

    /** Copies the currently published numbered monthly thought once, without changing its source row. */
    public void migratePublishedLegacyCollection() throws SQLException {
        if (!isConfigured() || !tableExists("dbo.intranet_thirukkural_daily_couplet")) return;
        try (Connection connection = connections.openConnection()) {
            connection.setAutoCommit(false);
            try {
                boolean alreadyPublished = false;
                try (PreparedStatement state = connection.prepareStatement("""
                        SELECT is_published FROM dbo.intranet_thirukkural_collection WITH (UPDLOCK, HOLDLOCK)
                        WHERE collection_id = 1
                        """); ResultSet result = state.executeQuery()) {
                    if (result.next()) alreadyPublished = result.getBoolean(1);
                }
                long dailyCount;
                try (PreparedStatement count = connection.prepareStatement("""
                        SELECT COUNT_BIG(*) FROM dbo.intranet_thirukkural_daily_couplet WHERE collection_id = 1
                        """); ResultSet result = count.executeQuery()) {
                    result.next();
                    dailyCount = result.getLong(1);
                }
                if (alreadyPublished || dailyCount != 0) {
                    connection.rollback();
                    return;
                }

                List<KuralText> migrated = List.of();
                LocalDate startDate = null;
                try (PreparedStatement legacy = connection.prepareStatement("""
                        SELECT body,
                               CAST((COALESCE(published_at, created_at) AT TIME ZONE 'UTC'
                                     AT TIME ZONE 'India Standard Time') AS DATE) AS start_date
                        FROM dbo.intranet_content
                        WHERE content_type = N'thoughts' AND status = N'PUBLISHED'
                        ORDER BY COALESCE(published_at, created_at) DESC, id DESC
                        """); ResultSet result = legacy.executeQuery()) {
                    while (result.next()) {
                        List<KuralText> parsed = ThirukkuralTextParser.parseTen(result.getString("body"));
                        if (parsed.size() == 10) {
                            migrated = parsed;
                            startDate = result.getObject("start_date", LocalDate.class);
                            break;
                        }
                    }
                }
                if (migrated.size() != 10 || startDate == null) {
                    connection.rollback();
                    return;
                }

                long publishedAt = startDate.atStartOfDay(INDIA_ZONE).toInstant().toEpochMilli();
                try (PreparedStatement state = connection.prepareStatement("""
                        MERGE dbo.intranet_thirukkural_collection AS target
                        USING (SELECT CAST(1 AS TINYINT) AS collection_id) AS source
                        ON target.collection_id = source.collection_id
                        WHEN MATCHED THEN UPDATE SET is_published = 1, current_index = 0,
                            published_at_epoch_ms = ?, next_advance_at_epoch_ms = NULL, updated_at = SYSUTCDATETIME()
                        WHEN NOT MATCHED THEN INSERT
                            (collection_id, is_published, current_index, published_at_epoch_ms, next_advance_at_epoch_ms)
                            VALUES (1, 1, 0, ?, NULL);
                        """)) {
                    state.setLong(1, publishedAt);
                    state.setLong(2, publishedAt);
                    state.executeUpdate();
                }
                insertCouplets(connection, migrated, startDate);
                connection.commit();
            } catch (SQLException | RuntimeException exception) {
                connection.rollback();
                throw exception;
            } finally {
                connection.setAutoCommit(true);
            }
        }
    }

    private void insertCouplets(Connection connection, List<KuralText> couplets, LocalDate startDate)
            throws SQLException {
        try (PreparedStatement insert = connection.prepareStatement("""
                INSERT INTO dbo.intranet_thirukkural_daily_couplet
                    (collection_id, kural_number, line1, line2, start_date)
                VALUES (1, ?, ?, ?, ?)
                """)) {
            for (KuralText couplet : couplets) {
                insert.setInt(1, couplet.kuralNumber());
                insert.setNString(2, couplet.line1());
                insert.setNString(3, couplet.line2());
                insert.setObject(4, startDate);
                insert.addBatch();
            }
            insert.executeBatch();
        }
    }

    private boolean tableExists(String qualifiedName) throws SQLException {
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement("SELECT OBJECT_ID(?, N'U')")) {
            statement.setString(1, qualifiedName);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() && result.getObject(1) != null;
            }
        }
    }

    private static void validateCollection(List<KuralText> couplets) {
        if (couplets == null || couplets.size() != 10) {
            throw new IllegalArgumentException("Enter all 10 Thirukkural couplets before publishing.");
        }
        for (int index = 0; index < couplets.size(); index++) {
            KuralText couplet = couplets.get(index);
            if (couplet == null || couplet.kuralNumber() != index + 1
                    || couplet.line1() == null || couplet.line1().isBlank()
                    || couplet.line2() == null || couplet.line2().isBlank()) {
                throw new IllegalArgumentException("Enter both Tamil lines for each Kural, numbered 1 through 10.");
            }
        }
    }

    private static LocalDate todayInIndia() {
        return LocalDate.now(INDIA_ZONE);
    }

    public record KuralText(int kuralNumber, String line1, String line2) {}
    public record AdminCollection(boolean storageConfigured, boolean schemaReady, boolean published, LocalDate startDate,
                                  int currentKuralNumber, List<KuralText> couplets) {}
    public record EmployeeCouplet(int kuralNumber, String line1, String line2, LocalDate startDate,
                                  String nextChangeAt) {}
}
