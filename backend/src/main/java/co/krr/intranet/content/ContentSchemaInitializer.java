package co.krr.intranet.content;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

@Component
public class ContentSchemaInitializer implements ApplicationRunner {
    private static final Logger logger = LoggerFactory.getLogger(ContentSchemaInitializer.class);
    private static final String[] SCHEMA_STATEMENTS = {
            """
            IF OBJECT_ID(N'dbo.intranet_content', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.intranet_content (
                    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    content_type NVARCHAR(32) NOT NULL,
                    title NVARCHAR(250) NOT NULL,
                    body NVARCHAR(MAX) NOT NULL,
                    status NVARCHAR(16) NOT NULL,
                    scheduled_at DATETIME2 NULL,
                    published_at DATETIME2 NULL,
                    announcement_date DATE NULL,
                    expires_on DATE NULL,
                    thought_month DATE NULL,
                    department NVARCHAR(120) NULL,
                    priority NVARCHAR(16) NOT NULL CONSTRAINT df_intranet_content_priority DEFAULT N'NORMAL',
                    pinned BIT NOT NULL CONSTRAINT df_intranet_content_pinned DEFAULT 0,
                    author NVARCHAR(120) NULL,
                    event_date DATE NULL,
                    event_time NVARCHAR(32) NULL,
                    location NVARCHAR(250) NULL,
                    effective_date DATE NULL,
                    created_at DATETIME2 NOT NULL CONSTRAINT df_intranet_content_created DEFAULT SYSUTCDATETIME(),
                    updated_at DATETIME2 NOT NULL CONSTRAINT df_intranet_content_updated DEFAULT SYSUTCDATETIME(),
                    CONSTRAINT ck_intranet_content_type CHECK
                        (content_type IN (N'announcements', N'thoughts', N'notices', N'meetings', N'holidays', N'policies')),
                    CONSTRAINT ck_intranet_content_status CHECK
                        (status IN (N'DRAFT', N'PUBLISHED', N'SCHEDULED'))
                );
            END
            """,
            """
            IF OBJECT_ID(N'dbo.intranet_employee', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.intranet_employee (
                    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    employee_code NVARCHAR(50) NOT NULL,
                    full_name NVARCHAR(120) NOT NULL,
                    job_title NVARCHAR(120) NOT NULL,
                    department_id NVARCHAR(80) NOT NULL,
                    is_active BIT NOT NULL CONSTRAINT df_intranet_employee_active DEFAULT 1,
                    is_department_head BIT NOT NULL CONSTRAINT df_intranet_employee_head DEFAULT 0,
                    created_at DATETIME2 NOT NULL CONSTRAINT df_intranet_employee_created DEFAULT SYSUTCDATETIME(),
                    updated_at DATETIME2 NOT NULL CONSTRAINT df_intranet_employee_updated DEFAULT SYSUTCDATETIME(),
                    CONSTRAINT uq_intranet_employee_code UNIQUE (employee_code)
                );
            END
            """,
            """
            IF OBJECT_ID(N'dbo.intranet_department_profile', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.intranet_department_profile (
                    department_id NVARCHAR(80) NOT NULL PRIMARY KEY,
                    overview NVARCHAR(2000) NULL,
                    updated_at DATETIME2 NOT NULL CONSTRAINT df_intranet_department_profile_updated DEFAULT SYSUTCDATETIME()
                );
            END
            """,
            """
            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE object_id = OBJECT_ID(N'dbo.intranet_employee')
                  AND name = N'ix_intranet_employee_department_active')
                CREATE INDEX ix_intranet_employee_department_active
                    ON dbo.intranet_employee(department_id, is_active, is_department_head);
            """,
            "IF COL_LENGTH(N'dbo.intranet_content', N'announcement_date') IS NULL "
                    + "ALTER TABLE dbo.intranet_content ADD announcement_date DATE NULL;",
            "IF COL_LENGTH(N'dbo.intranet_content', N'expires_on') IS NULL "
                    + "ALTER TABLE dbo.intranet_content ADD expires_on DATE NULL;",
            "IF COL_LENGTH(N'dbo.intranet_content', N'thought_month') IS NULL "
                    + "ALTER TABLE dbo.intranet_content ADD thought_month DATE NULL;",
            """
            UPDATE dbo.intranet_content
            SET thought_month = DATEFROMPARTS(
                    YEAR(COALESCE(published_at, created_at)),
                    MONTH(COALESCE(published_at, created_at)),
                    1)
            WHERE content_type = N'thoughts' AND thought_month IS NULL;
            """,
            """
            IF NOT EXISTS (
                SELECT 1 FROM sys.check_constraints
                WHERE parent_object_id = OBJECT_ID(N'dbo.intranet_content')
                  AND name = N'ck_intranet_content_thought_month')
                ALTER TABLE dbo.intranet_content WITH CHECK
                ADD CONSTRAINT ck_intranet_content_thought_month
                    CHECK (content_type <> N'thoughts' OR thought_month IS NOT NULL);
            """,
            """
            IF NOT EXISTS (
                SELECT 1 FROM sys.check_constraints
                WHERE parent_object_id = OBJECT_ID(N'dbo.intranet_content')
                  AND name = N'ck_intranet_content_announcement_expiry')
                ALTER TABLE dbo.intranet_content WITH CHECK
                ADD CONSTRAINT ck_intranet_content_announcement_expiry
                    CHECK (announcement_date IS NULL OR expires_on IS NULL OR expires_on >= announcement_date);
            """,
            """
            IF EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE object_id = OBJECT_ID(N'dbo.intranet_content')
                  AND name = N'ux_intranet_content_active_thought_month')
                DROP INDEX ux_intranet_content_active_thought_month ON dbo.intranet_content;

            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE object_id = OBJECT_ID(N'dbo.intranet_content')
                  AND name = N'ux_intranet_content_published_thought_month')
                CREATE UNIQUE INDEX ux_intranet_content_published_thought_month
                    ON dbo.intranet_content(thought_month)
                    WHERE content_type = N'thoughts' AND status = N'PUBLISHED';
            """
    };

    private final SqlServerConnectionProvider connections;
    private final ThirukkuralCollectionService thirukkuralCollectionService;

    public ContentSchemaInitializer(SqlServerConnectionProvider connections,
                                    ThirukkuralCollectionService thirukkuralCollectionService) {
        this.connections = connections;
        this.thirukkuralCollectionService = thirukkuralCollectionService;
    }

    @Override
    public void run(ApplicationArguments args) throws SQLException {
        if (!connections.isConfigured()) return;
        try (Connection connection = connections.openConnection();
             Statement statement = connection.createStatement()) {
            for (String schemaStatement : SCHEMA_STATEMENTS) {
                statement.execute(schemaStatement);
            }
            initializePolicyDocumentSchema(statement);
            initializeThirukkuralSchema(statement);
            initializeDailyThirukkuralSchema(statement);
        }
        thirukkuralCollectionService.migratePublishedLegacyCollection();
    }

    private void initializeDailyThirukkuralSchema(Statement statement) throws SQLException {
        try {
            statement.execute("""
                    IF OBJECT_ID(N'dbo.intranet_thirukkural_daily_couplet', N'U') IS NULL
                    CREATE TABLE dbo.intranet_thirukkural_daily_couplet (
                        collection_id TINYINT NOT NULL,
                        kural_number TINYINT NOT NULL,
                        line1 NVARCHAR(MAX) NOT NULL,
                        line2 NVARCHAR(MAX) NOT NULL,
                        start_date DATE NOT NULL,
                        CONSTRAINT pk_intranet_thirukkural_daily_couplet PRIMARY KEY (collection_id, kural_number),
                        CONSTRAINT fk_intranet_thirukkural_daily_collection FOREIGN KEY (collection_id)
                            REFERENCES dbo.intranet_thirukkural_collection(collection_id),
                        CONSTRAINT ck_intranet_thirukkural_daily_number CHECK (kural_number BETWEEN 1 AND 10)
                    );
                    """);
        } catch (SQLException exception) {
            if (exception.getErrorCode() != 262) throw exception;
            logger.warn("Daily Thirukkural storage could not be provisioned by the website database user. "
                    + "Run backend/sql/provision-intranet-content.sql with a database owner account.");
        }
    }

    private void initializeThirukkuralSchema(Statement statement) throws SQLException {
        try {
            statement.execute("""
                    IF OBJECT_ID(N'dbo.intranet_thirukkural_collection', N'U') IS NULL
                    CREATE TABLE dbo.intranet_thirukkural_collection (
                        collection_id TINYINT NOT NULL CONSTRAINT pk_intranet_thirukkural_collection PRIMARY KEY,
                        is_published BIT NOT NULL,
                        current_index TINYINT NOT NULL,
                        published_at_epoch_ms BIGINT NULL,
                        next_advance_at_epoch_ms BIGINT NULL,
                        updated_at DATETIME2 NOT NULL CONSTRAINT df_intranet_thirukkural_updated DEFAULT SYSUTCDATETIME(),
                        CONSTRAINT ck_intranet_thirukkural_singleton CHECK (collection_id = 1),
                        CONSTRAINT ck_intranet_thirukkural_index CHECK (current_index BETWEEN 0 AND 9)
                    );
                    """);
            statement.execute("""
                    IF OBJECT_ID(N'dbo.intranet_thirukkural_couplet', N'U') IS NULL
                    CREATE TABLE dbo.intranet_thirukkural_couplet (
                        collection_id TINYINT NOT NULL,
                        sequence_number TINYINT NOT NULL,
                        tamil_text NVARCHAR(MAX) NOT NULL,
                        CONSTRAINT pk_intranet_thirukkural_couplet PRIMARY KEY (collection_id, sequence_number),
                        CONSTRAINT fk_intranet_thirukkural_couplet_collection FOREIGN KEY (collection_id)
                            REFERENCES dbo.intranet_thirukkural_collection(collection_id),
                        CONSTRAINT ck_intranet_thirukkural_sequence CHECK (sequence_number BETWEEN 1 AND 10)
                    );
                    """);
        } catch (SQLException exception) {
            if (exception.getErrorCode() != 262) throw exception;
            logger.warn("Thirukkural storage could not be provisioned by the website database user. "
                    + "Run backend/sql/provision-intranet-content.sql with a database owner account.");
        }
    }

    private void initializePolicyDocumentSchema(Statement statement) throws SQLException {
        try {
            statement.execute("""
                    IF OBJECT_ID(N'dbo.intranet_policy_document', N'U') IS NULL
                    BEGIN
                        CREATE TABLE dbo.intranet_policy_document (
                            id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                            section NVARCHAR(40) NOT NULL,
                            title NVARCHAR(250) NOT NULL,
                            description NVARCHAR(2000) NULL,
                            content NVARCHAR(MAX) NULL,
                            original_file_name NVARCHAR(255) NULL,
                            media_type NVARCHAR(128) NULL,
                            file_size BIGINT NULL,
                            status NVARCHAR(16) NOT NULL CONSTRAINT df_intranet_policy_document_status DEFAULT N'DRAFT',
                            file_data VARBINARY(MAX) NULL,
                            created_at DATETIME2 NOT NULL CONSTRAINT df_intranet_policy_document_created DEFAULT SYSUTCDATETIME(),
                            updated_at DATETIME2 NOT NULL CONSTRAINT df_intranet_policy_document_updated DEFAULT SYSUTCDATETIME(),
                            CONSTRAINT ck_intranet_policy_document_section CHECK
                                (section IN (N'policies', N'procedure', N'committee', N'sops', N'process-flow-chart')),
                            CONSTRAINT ck_intranet_policy_document_status CHECK (status IN (N'DRAFT', N'PUBLISHED')),
                            CONSTRAINT ck_intranet_policy_document_size CHECK (
                                (file_size IS NULL AND file_data IS NULL AND original_file_name IS NULL AND media_type IS NULL)
                                OR (file_size > 0 AND file_size <= 20971520 AND file_data IS NOT NULL AND original_file_name IS NOT NULL AND media_type IS NOT NULL)
                            ),
                            CONSTRAINT ck_intranet_policy_document_payload CHECK (
                                (content IS NOT NULL AND LEN(LTRIM(RTRIM(content))) > 0)
                                OR file_data IS NOT NULL
                            )
                        );
                    END
                    """);
            statement.execute("""
                    IF COL_LENGTH(N'dbo.intranet_policy_document', N'content') IS NULL
                    BEGIN
                        ALTER TABLE dbo.intranet_policy_document ADD content NVARCHAR(MAX) NULL;
                        ALTER TABLE dbo.intranet_policy_document ALTER COLUMN original_file_name NVARCHAR(255) NULL;
                        ALTER TABLE dbo.intranet_policy_document ALTER COLUMN media_type NVARCHAR(128) NULL;
                        ALTER TABLE dbo.intranet_policy_document ALTER COLUMN file_size BIGINT NULL;
                        ALTER TABLE dbo.intranet_policy_document ALTER COLUMN file_data VARBINARY(MAX) NULL;
                        IF EXISTS (
                            SELECT 1 FROM sys.check_constraints
                            WHERE parent_object_id = OBJECT_ID(N'dbo.intranet_policy_document')
                              AND name = N'ck_intranet_policy_document_size')
                            ALTER TABLE dbo.intranet_policy_document DROP CONSTRAINT ck_intranet_policy_document_size;
                        ALTER TABLE dbo.intranet_policy_document WITH CHECK
                        ADD CONSTRAINT ck_intranet_policy_document_size CHECK (
                            (file_size IS NULL AND file_data IS NULL AND original_file_name IS NULL AND media_type IS NULL)
                            OR (file_size > 0 AND file_size <= 20971520 AND file_data IS NOT NULL AND original_file_name IS NOT NULL AND media_type IS NOT NULL)
                        );
                        EXEC sys.sp_executesql N'
                            ALTER TABLE dbo.intranet_policy_document WITH CHECK
                            ADD CONSTRAINT ck_intranet_policy_document_payload CHECK (
                                (content IS NOT NULL AND LEN(LTRIM(RTRIM(content))) > 0)
                                OR file_data IS NOT NULL
                            );';
                    END
                    """);
            statement.execute("""
                    IF NOT EXISTS (
                        SELECT 1 FROM sys.indexes
                        WHERE object_id = OBJECT_ID(N'dbo.intranet_policy_document')
                          AND name = N'ix_intranet_policy_document_section_status')
                        CREATE INDEX ix_intranet_policy_document_section_status
                            ON dbo.intranet_policy_document(section, status, created_at DESC);
                    """);
        } catch (SQLException exception) {
            if (exception.getErrorCode() != 262) throw exception;
            logger.warn("Policy document storage could not be provisioned by the website database user. "
                    + "Run backend/sql/provision-intranet-content.sql with a database owner account.");
        }
    }
}
