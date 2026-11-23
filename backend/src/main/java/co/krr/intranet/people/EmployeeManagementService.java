package co.krr.intranet.people;

import co.krr.intranet.content.SqlServerConnectionProvider;
import co.krr.intranet.employee.DepartmentCatalog;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class EmployeeManagementService {
    private static final String STORAGE_UNAVAILABLE =
            "Microsoft SQL Server is not configured; employee and department records cannot be saved.";
    private static final String SELECT_EMPLOYEES = """
            SELECT id, employee_code, full_name, job_title, department_id,
                   is_active, is_department_head
            FROM dbo.intranet_employee
            """;

    private final SqlServerConnectionProvider connections;
    private final DepartmentCatalog departmentCatalog;
    private final Map<String, DepartmentCatalog.Department> departmentsById;

    public EmployeeManagementService(
            SqlServerConnectionProvider connections,
            DepartmentCatalog departmentCatalog) {
        this.connections = connections;
        this.departmentCatalog = departmentCatalog;
        this.departmentsById = departmentCatalog.all().stream()
                .collect(LinkedHashMap::new,
                        (departments, department) -> departments.put(department.id(), department),
                        LinkedHashMap::putAll);
    }

    public boolean isConfigured() {
        return connections.isConfigured();
    }

    public String unavailableMessage() {
        return STORAGE_UNAVAILABLE;
    }

    public int departmentCount() {
        return departmentCatalog.all().size();
    }

    public EmployeeCollection employeesForAdmin() {
        if (!isConfigured()) {
            return new EmployeeCollection(false, List.of(), STORAGE_UNAVAILABLE);
        }
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement(
                     SELECT_EMPLOYEES + " ORDER BY department_id, full_name, id");
             ResultSet results = statement.executeQuery()) {
            return new EmployeeCollection(true, readEmployees(results), null);
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public DepartmentCollection departmentsForAdmin() {
        if (!isConfigured()) {
            return new DepartmentCollection(
                    false,
                    departmentCatalog.all().stream()
                            .map(department -> new DepartmentManagementItem(
                                    department.id(),
                                    department.name(),
                                    department.graphic(),
                                    department.overview(),
                                    0))
                            .toList(),
                    STORAGE_UNAVAILABLE);
        }

        try (Connection connection = connections.openConnection()) {
            Map<String, String> overviews = readDepartmentOverviews(connection);
            Map<String, Integer> counts = readActiveEmployeeCounts(connection);
            List<DepartmentManagementItem> items = departmentCatalog.all().stream()
                    .map(department -> new DepartmentManagementItem(
                            department.id(),
                            department.name(),
                            department.graphic(),
                            overviews.getOrDefault(department.id(), department.overview()),
                            counts.getOrDefault(department.id(), 0)))
                    .toList();
            return new DepartmentCollection(true, items, null);
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public List<EmployeeDepartment> departmentsForEmployees() {
        if (!isConfigured()) {
            return departmentCatalog.all().stream()
                    .map(department -> new EmployeeDepartment(
                            department.id(),
                            department.name(),
                            department.graphic(),
                            department.overview(),
                            List.of()))
                    .toList();
        }

        try (Connection connection = connections.openConnection()) {
            Map<String, String> overviews = readDepartmentOverviews(connection);
            Map<String, List<EmployeeSummary>> employees = readActiveEmployeesByDepartment(connection);
            return departmentCatalog.all().stream()
                    .map(department -> new EmployeeDepartment(
                            department.id(),
                            department.name(),
                            department.graphic(),
                            overviews.getOrDefault(department.id(), department.overview()),
                            employees.getOrDefault(department.id(), List.of())))
                    .toList();
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public Integer activeEmployeeCount() {
        if (!isConfigured()) return null;
        String sql = "SELECT COUNT(*) FROM dbo.intranet_employee WHERE is_active = 1";
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet result = statement.executeQuery()) {
            return result.next() ? result.getInt(1) : 0;
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public EmployeeProfile createEmployee(EmployeeRequest request) {
        requireStorage();
        requireDepartment(request.departmentId());
        validateEmployee(request);
        String sql = """
                INSERT INTO dbo.intranet_employee
                    (employee_code, full_name, job_title, department_id,
                     is_active, is_department_head, created_at, updated_at)
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, ?, ?, ?, SYSUTCDATETIME(), SYSUTCDATETIME())
                """;
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            bindEmployee(statement, request);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) {
                    throw new SQLException("SQL Server did not return the employee identifier.");
                }
                return findEmployee(connection, result.getLong(1));
            }
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public EmployeeProfile updateEmployee(long id, EmployeeRequest request) {
        requireStorage();
        requireDepartment(request.departmentId());
        validateEmployee(request);
        String sql = """
                UPDATE dbo.intranet_employee
                SET employee_code = ?, full_name = ?, job_title = ?, department_id = ?,
                    is_active = ?, is_department_head = ?, updated_at = SYSUTCDATETIME()
                WHERE id = ?
                """;
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            bindEmployee(statement, request);
            statement.setLong(7, id);
            if (statement.executeUpdate() == 0) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee record not found.");
            }
            return findEmployee(connection, id);
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public void deactivateEmployee(long id) {
        requireStorage();
        String sql = """
                UPDATE dbo.intranet_employee
                SET is_active = 0, is_department_head = 0, updated_at = SYSUTCDATETIME()
                WHERE id = ?
                """;
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, id);
            if (statement.executeUpdate() == 0) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee record not found.");
            }
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    public DepartmentManagementItem updateDepartmentOverview(String id, String overview) {
        requireStorage();
        DepartmentCatalog.Department department = requireDepartment(id);
        String sql = """
                MERGE dbo.intranet_department_profile WITH (HOLDLOCK) AS target
                USING (SELECT ? AS department_id, ? AS overview) AS source
                ON target.department_id = source.department_id
                WHEN MATCHED THEN
                    UPDATE SET overview = source.overview, updated_at = SYSUTCDATETIME()
                WHEN NOT MATCHED THEN
                    INSERT (department_id, overview, updated_at)
                    VALUES (source.department_id, source.overview, SYSUTCDATETIME());
                """;
        try (Connection connection = connections.openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, id);
            statement.setString(2, blankToNull(overview));
            statement.executeUpdate();
            int count = readActiveEmployeeCounts(connection).getOrDefault(id, 0);
            return new DepartmentManagementItem(
                    department.id(),
                    department.name(),
                    department.graphic(),
                    blankToNull(overview) == null ? department.overview() : overview.trim(),
                    count);
        } catch (SQLException exception) {
            throw storageFailure(exception);
        }
    }

    private List<EmployeeProfile> readEmployees(ResultSet results) throws SQLException {
        List<EmployeeProfile> employees = new ArrayList<>();
        while (results.next()) {
            employees.add(readEmployee(results));
        }
        return employees;
    }

    private EmployeeProfile readEmployee(ResultSet result) throws SQLException {
        String departmentId = result.getString("department_id");
        DepartmentCatalog.Department department = departmentsById.get(departmentId);
        return new EmployeeProfile(
                result.getLong("id"),
                result.getString("employee_code"),
                result.getString("full_name"),
                result.getString("job_title"),
                departmentId,
                department == null ? departmentId : department.name(),
                result.getBoolean("is_active"),
                result.getBoolean("is_department_head"));
    }

    private EmployeeProfile findEmployee(Connection connection, long id) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                SELECT_EMPLOYEES + " WHERE id = ?")) {
            statement.setLong(1, id);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) {
                    throw new SQLException("Employee record was unavailable after the write.");
                }
                return readEmployee(result);
            }
        }
    }

    private Map<String, String> readDepartmentOverviews(Connection connection) throws SQLException {
        Map<String, String> overviews = new LinkedHashMap<>();
        String sql = "SELECT department_id, overview FROM dbo.intranet_department_profile";
        try (PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet results = statement.executeQuery()) {
            while (results.next()) {
                String overview = results.getString("overview");
                if (overview != null && !overview.isBlank()) {
                    overviews.put(results.getString("department_id"), overview);
                }
            }
        }
        return overviews;
    }

    private Map<String, Integer> readActiveEmployeeCounts(Connection connection) throws SQLException {
        Map<String, Integer> counts = new LinkedHashMap<>();
        String sql = """
                SELECT department_id, COUNT(*) AS employee_count
                FROM dbo.intranet_employee
                WHERE is_active = 1
                GROUP BY department_id
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet results = statement.executeQuery()) {
            while (results.next()) {
                counts.put(results.getString("department_id"), results.getInt("employee_count"));
            }
        }
        return counts;
    }

    private Map<String, List<EmployeeSummary>> readActiveEmployeesByDepartment(
            Connection connection) throws SQLException {
        Map<String, List<EmployeeSummary>> employees = new LinkedHashMap<>();
        String sql = """
                SELECT department_id, full_name, job_title, is_department_head
                FROM dbo.intranet_employee
                WHERE is_active = 1
                ORDER BY department_id, is_department_head DESC, full_name
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet results = statement.executeQuery()) {
            while (results.next()) {
                employees.computeIfAbsent(results.getString("department_id"), ignored -> new ArrayList<>())
                        .add(new EmployeeSummary(
                                results.getString("full_name"),
                                results.getString("job_title"),
                                results.getBoolean("is_department_head")));
            }
        }
        return employees;
    }

    private void bindEmployee(PreparedStatement statement, EmployeeRequest request) throws SQLException {
        statement.setString(1, request.employeeCode().trim());
        statement.setString(2, request.fullName().trim());
        statement.setString(3, request.jobTitle().trim());
        statement.setString(4, request.departmentId());
        statement.setBoolean(5, request.active());
        statement.setBoolean(6, request.active() && request.departmentHead());
    }

    private void validateEmployee(EmployeeRequest request) {
        if (request.departmentHead() && !request.active()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "An inactive employee cannot be marked as a department head.");
        }
    }

    private DepartmentCatalog.Department requireDepartment(String id) {
        DepartmentCatalog.Department department = departmentsById.get(id);
        if (department == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose one of the company departments.");
        }
        return department;
    }

    private void requireStorage() {
        if (!isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, STORAGE_UNAVAILABLE);
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private ResponseStatusException storageFailure(SQLException exception) {
        if (exception.getErrorCode() == 2601 || exception.getErrorCode() == 2627) {
            return new ResponseStatusException(HttpStatus.CONFLICT, "That employee code is already in use.");
        }
        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "SQL Server employee and department storage is currently unavailable.",
                exception);
    }

    public record EmployeeRequest(
            @NotBlank @Size(max = 50) String employeeCode,
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Size(max = 120) String jobTitle,
            @NotBlank @Size(max = 80) String departmentId,
            boolean active,
            boolean departmentHead) {
        public EmployeeRequest {
            fullName = PersonNameFormatter.format(fullName);
        }
    }

    public record EmployeeProfile(
            long id,
            String employeeCode,
            String fullName,
            String jobTitle,
            String departmentId,
            String departmentName,
            boolean active,
            boolean departmentHead) {
        public EmployeeProfile {
            fullName = PersonNameFormatter.format(fullName);
        }
    }

    public record EmployeeSummary(String name, String title, boolean departmentHead) {
        public EmployeeSummary {
            name = PersonNameFormatter.format(name);
        }
    }

    public record EmployeeDepartment(
            String id,
            String name,
            String graphic,
            String overview,
            List<EmployeeSummary> employees) {
    }

    public record DepartmentManagementItem(
            String id,
            String name,
            String graphic,
            String overview,
            int activeEmployees) {
    }

    public record EmployeeCollection(
            boolean storageConfigured,
            List<EmployeeProfile> items,
            String unavailableMessage) {
    }

    public record DepartmentCollection(
            boolean storageConfigured,
            List<DepartmentManagementItem> items,
            String unavailableMessage) {
    }
}
