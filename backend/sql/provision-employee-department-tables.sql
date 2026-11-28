USE [intranet];
SET XACT_ABORT ON;

DECLARE @WebsiteDatabaseUser sysname = N'intranet_user';

-- Use the database principal mapped to the website SQL login. When connected as
-- that login, SELECT USER_NAME() returns the value needed here.
IF DB_NAME() <> N'intranet'
    THROW 51000, 'Run this script only in the intranet database.', 1;

IF DATABASE_PRINCIPAL_ID(@WebsiteDatabaseUser) IS NULL
    THROW 51002, 'The database user intranet_user does not exist in intranet.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

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
    END;

    IF OBJECT_ID(N'dbo.intranet_department_profile', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.intranet_department_profile (
            department_id NVARCHAR(80) NOT NULL PRIMARY KEY,
            overview NVARCHAR(2000) NULL,
            updated_at DATETIME2 NOT NULL
                CONSTRAINT df_intranet_department_profile_updated DEFAULT SYSUTCDATETIME()
        );
    END;

    IF COL_LENGTH(N'dbo.intranet_employee', N'employee_code') IS NULL
       OR COL_LENGTH(N'dbo.intranet_employee', N'full_name') IS NULL
       OR COL_LENGTH(N'dbo.intranet_employee', N'job_title') IS NULL
       OR COL_LENGTH(N'dbo.intranet_employee', N'department_id') IS NULL
       OR COL_LENGTH(N'dbo.intranet_employee', N'is_active') IS NULL
       OR COL_LENGTH(N'dbo.intranet_employee', N'is_department_head') IS NULL
        THROW 51003, 'The existing employee table does not match the expected schema; no data was changed.', 1;

    IF COL_LENGTH(N'dbo.intranet_department_profile', N'department_id') IS NULL
       OR COL_LENGTH(N'dbo.intranet_department_profile', N'overview') IS NULL
        THROW 51004, 'The existing department table does not match the expected schema; no data was changed.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.intranet_employee')
          AND name = N'ix_intranet_employee_department_active')
        CREATE INDEX ix_intranet_employee_department_active
            ON dbo.intranet_employee(department_id, is_active, is_department_head);

    DECLARE @QuotedWebsiteUser nvarchar(258) = QUOTENAME(@WebsiteDatabaseUser);
    DECLARE @GrantStatements nvarchar(max) =
        N'GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.intranet_employee TO '
        + @QuotedWebsiteUser
        + N'; GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.intranet_department_profile TO '
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
