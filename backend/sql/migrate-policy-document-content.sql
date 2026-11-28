USE [intranet];
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;

IF DB_NAME() <> N'intranet'
    THROW 51030, 'Run this script only in the intranet database.', 1;

IF OBJECT_ID(N'dbo.intranet_policy_document', N'U') IS NULL
    THROW 51031, 'Run backend/sql/provision-intranet-content.sql before running this migration.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    IF COL_LENGTH(N'dbo.intranet_policy_document', N'content') IS NULL
        ALTER TABLE dbo.intranet_policy_document ADD content NVARCHAR(MAX) NULL;

    ALTER TABLE dbo.intranet_policy_document ALTER COLUMN original_file_name NVARCHAR(255) NULL;
    ALTER TABLE dbo.intranet_policy_document ALTER COLUMN media_type NVARCHAR(128) NULL;
    ALTER TABLE dbo.intranet_policy_document ALTER COLUMN file_size BIGINT NULL;
    ALTER TABLE dbo.intranet_policy_document ALTER COLUMN file_data VARBINARY(MAX) NULL;

    IF EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.intranet_policy_document')
          AND name = N'ck_intranet_policy_document_size')
        ALTER TABLE dbo.intranet_policy_document DROP CONSTRAINT ck_intranet_policy_document_size;

    ALTER TABLE dbo.intranet_policy_document WITH CHECK
    ADD CONSTRAINT ck_intranet_policy_document_size CHECK (
        (file_size IS NULL AND file_data IS NULL AND original_file_name IS NULL AND media_type IS NULL)
        OR (file_size > 0 AND file_size <= 20971520 AND file_data IS NOT NULL AND original_file_name IS NOT NULL AND media_type IS NOT NULL)
    );

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.intranet_policy_document')
          AND name = N'ck_intranet_policy_document_payload')
        EXEC sys.sp_executesql N'
            ALTER TABLE dbo.intranet_policy_document WITH CHECK
            ADD CONSTRAINT ck_intranet_policy_document_payload CHECK (
                (content IS NOT NULL AND LEN(LTRIM(RTRIM(content))) > 0)
                OR file_data IS NOT NULL
            );';

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
