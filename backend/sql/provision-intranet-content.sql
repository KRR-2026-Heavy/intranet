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

    IF OBJECT_ID(N'dbo.intranet_policy_document', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.intranet_policy_document (
            id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
            section NVARCHAR(40) NOT NULL,
            title NVARCHAR(250) NOT NULL,
            description NVARCHAR(2000) NULL,
            original_file_name NVARCHAR(255) NOT NULL,
            media_type NVARCHAR(128) NOT NULL,
            file_size BIGINT NOT NULL,
            status NVARCHAR(16) NOT NULL CONSTRAINT df_intranet_policy_document_status DEFAULT N'DRAFT',
            file_data VARBINARY(MAX) NOT NULL,
            created_at DATETIME2 NOT NULL CONSTRAINT df_intranet_policy_document_created DEFAULT SYSUTCDATETIME(),
            updated_at DATETIME2 NOT NULL CONSTRAINT df_intranet_policy_document_updated DEFAULT SYSUTCDATETIME(),
            CONSTRAINT ck_intranet_policy_document_section CHECK
                (section IN (N'policies', N'procedure', N'committee', N'sops', N'process-flow-chart')),
            CONSTRAINT ck_intranet_policy_document_status CHECK (status IN (N'DRAFT', N'PUBLISHED')),
            CONSTRAINT ck_intranet_policy_document_size CHECK (file_size > 0 AND file_size <= 20971520)
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.intranet_policy_document')
          AND name = N'ix_intranet_policy_document_section_status')
        CREATE INDEX ix_intranet_policy_document_section_status
            ON dbo.intranet_policy_document(section, status, created_at DESC);

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

    DECLARE @QuotedWebsiteUser nvarchar(258) = QUOTENAME(@WebsiteDatabaseUser);
    DECLARE @GrantStatements nvarchar(max) =
        N'GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.intranet_content TO '
        + @QuotedWebsiteUser
        + N'; GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.intranet_policy_document TO '
        + @QuotedWebsiteUser
        + N'; GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.intranet_thirukkural_collection TO '
        + @QuotedWebsiteUser
        + N'; GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.intranet_thirukkural_couplet TO '
        + @QuotedWebsiteUser
        + N'; GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.intranet_thirukkural_daily_couplet TO '
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
