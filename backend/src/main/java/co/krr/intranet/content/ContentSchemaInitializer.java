package co.krr.intranet.content;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

@Component
public class ContentSchemaInitializer implements ApplicationRunner {
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

    public ContentSchemaInitializer(SqlServerConnectionProvider connections) {
        this.connections = connections;
    }

    @Override
    public void run(ApplicationArguments args) throws SQLException {
        if (!connections.isConfigured()) return;
        try (Connection connection = connections.openConnection();
             Statement statement = connection.createStatement()) {
            for (String schemaStatement : SCHEMA_STATEMENTS) {
                statement.execute(schemaStatement);
            }
        }
    }
}
