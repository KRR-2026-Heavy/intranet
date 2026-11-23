USE [KRRIntranet];
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;

DECLARE @WebsiteDatabaseUser sysname = N'krr_website';

IF DB_NAME() <> N'KRRIntranet'
    THROW 51010, 'Run this script only in the KRRIntranet database.', 1;

IF DATABASE_PRINCIPAL_ID(@WebsiteDatabaseUser) IS NULL
    THROW 51012, 'The database user krr_website does not exist in KRRIntranet.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

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
    END;

    IF COL_LENGTH(N'dbo.intranet_content', N'id') IS NULL
       OR COL_LENGTH(N'dbo.intranet_content', N'content_type') IS NULL
       OR COL_LENGTH(N'dbo.intranet_content', N'title') IS NULL
       OR COL_LENGTH(N'dbo.intranet_content', N'body') IS NULL
       OR COL_LENGTH(N'dbo.intranet_content', N'status') IS NULL
       OR COL_LENGTH(N'dbo.intranet_content', N'scheduled_at') IS NULL
       OR COL_LENGTH(N'dbo.intranet_content', N'published_at') IS NULL
       OR COL_LENGTH(N'dbo.intranet_content', N'department') IS NULL
       OR COL_LENGTH(N'dbo.intranet_content', N'priority') IS NULL
       OR COL_LENGTH(N'dbo.intranet_content', N'pinned') IS NULL
       OR COL_LENGTH(N'dbo.intranet_content', N'author') IS NULL
       OR COL_LENGTH(N'dbo.intranet_content', N'event_date') IS NULL
       OR COL_LENGTH(N'dbo.intranet_content', N'event_time') IS NULL
       OR COL_LENGTH(N'dbo.intranet_content', N'location') IS NULL
       OR COL_LENGTH(N'dbo.intranet_content', N'effective_date') IS NULL
       OR COL_LENGTH(N'dbo.intranet_content', N'created_at') IS NULL
       OR COL_LENGTH(N'dbo.intranet_content', N'updated_at') IS NULL
        THROW 51013, 'The existing content table does not match the expected schema; no data was changed.', 1;

    IF COL_LENGTH(N'dbo.intranet_content', N'announcement_date') IS NULL
        ALTER TABLE dbo.intranet_content ADD announcement_date DATE NULL;
    IF COL_LENGTH(N'dbo.intranet_content', N'expires_on') IS NULL
        ALTER TABLE dbo.intranet_content ADD expires_on DATE NULL;
    IF COL_LENGTH(N'dbo.intranet_content', N'thought_month') IS NULL
        ALTER TABLE dbo.intranet_content ADD thought_month DATE NULL;

    UPDATE dbo.intranet_content
    SET thought_month = DATEFROMPARTS(
            YEAR(COALESCE(published_at, created_at)),
            MONTH(COALESCE(published_at, created_at)),
            1)
    WHERE content_type = N'thoughts' AND thought_month IS NULL;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.intranet_content')
          AND name = N'ck_intranet_content_thought_month')
        ALTER TABLE dbo.intranet_content WITH CHECK
        ADD CONSTRAINT ck_intranet_content_thought_month
            CHECK (content_type <> N'thoughts' OR thought_month IS NOT NULL);

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.intranet_content')
          AND name = N'ck_intranet_content_announcement_expiry')
        ALTER TABLE dbo.intranet_content WITH CHECK
        ADD CONSTRAINT ck_intranet_content_announcement_expiry
            CHECK (announcement_date IS NULL OR expires_on IS NULL OR expires_on >= announcement_date);

    IF EXISTS (
        SELECT thought_month
        FROM dbo.intranet_content
        WHERE content_type = N'thoughts' AND status = N'PUBLISHED'
        GROUP BY thought_month
        HAVING COUNT(*) > 1)
        THROW 51014, 'Resolve duplicate published monthly thoughts before creating the unique index.', 1;

    IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.intranet_content')
          AND name = N'ux_intranet_content_active_thought_month')
        DROP INDEX ux_intranet_content_active_thought_month ON dbo.intranet_content;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.intranet_content')
          AND name = N'ux_intranet_content_published_thought_month')
        CREATE UNIQUE INDEX ux_intranet_content_published_thought_month
            ON dbo.intranet_content(thought_month)
            WHERE content_type = N'thoughts' AND status = N'PUBLISHED';

    DECLARE @QuotedWebsiteUser nvarchar(258) = QUOTENAME(@WebsiteDatabaseUser);
    DECLARE @GrantStatements nvarchar(max) =
        N'GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.intranet_content TO '
        + @QuotedWebsiteUser
        + N';';
    EXEC sys.sp_executesql @GrantStatements;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
