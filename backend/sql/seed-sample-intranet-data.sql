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
    THROW 51020, 'Run this script only in the intranet database.', 1;

IF OBJECT_ID(N'dbo.intranet_content', N'U') IS NULL
   OR OBJECT_ID(N'dbo.intranet_employee', N'U') IS NULL
   OR OBJECT_ID(N'dbo.intranet_department_profile', N'U') IS NULL
    THROW 51021, 'Run both schema provisioning scripts before inserting sample data.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO dbo.intranet_department_profile (department_id, overview)
    SELECT sample.department_id, N'SAMPLE DATA ONLY - Replace with the official department overview.'
    FROM (VALUES
        (N'store'),
        (N'production'),
        (N'quality'),
        (N'maintenance'),
        (N'hr-admin'),
        (N'safety'),
        (N'auto-clave'),
        (N'dished-end'),
        (N'business-systems-developments'),
        (N'purchase'),
        (N'sales-proposal'),
        (N'design-team'),
        (N'business-development'),
        (N'project-team'),
        (N'planning-team'),
        (N'site-execution')
    ) AS sample(department_id)
    WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.intranet_department_profile AS existing
        WHERE existing.department_id = sample.department_id);

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.intranet_employee
        WHERE employee_code = N'SAMPLE-ONLY-DO-NOT-USE')
        INSERT INTO dbo.intranet_employee (
            employee_code,
            full_name,
            job_title,
            department_id,
            is_active,
            is_department_head)
        VALUES (
            N'SAMPLE-ONLY-DO-NOT-USE',
            N'SAMPLE DATA - NOT A REAL PERSON',
            N'SAMPLE - Replace with the official job title',
            N'production',
            0,
            0);

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.intranet_content
        WHERE content_type = N'holidays'
          AND title = N'SAMPLE DATA - Replace with official holiday')
        INSERT INTO dbo.intranet_content (
            content_type,
            title,
            body,
            status,
            priority,
            pinned,
            author)
        VALUES (
            N'holidays',
            N'SAMPLE DATA - Replace with official holiday',
            N'SAMPLE DATA ONLY. This is not an official holiday and has no assumed date. Edit it with verified information or delete this draft.',
            N'DRAFT',
            N'NORMAL',
            0,
            N'SAMPLE DATA ONLY');

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
