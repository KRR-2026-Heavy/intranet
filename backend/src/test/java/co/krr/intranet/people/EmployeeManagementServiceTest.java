package co.krr.intranet.people;

import co.krr.intranet.content.SqlServerConnectionProvider;
import co.krr.intranet.employee.DepartmentCatalog;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;

class EmployeeManagementServiceTest {
    @Test
    void preservesAllSuppliedDepartmentsWithoutInventingEmployeeRecords() {
        EmployeeManagementService service = new EmployeeManagementService(
                mock(SqlServerConnectionProvider.class),
                new DepartmentCatalog());

        var departments = service.departmentsForEmployees();

        assertEquals(16, departments.size());
        assertEquals("Store", departments.get(0).name());
        assertEquals("Department overview has not been published.", departments.get(0).overview());
        assertEquals(0, departments.get(0).employees().size());
        assertFalse(service.employeesForAdmin().storageConfigured());
        assertEquals(0, service.employeesForAdmin().items().size());
        assertNull(service.activeEmployeeCount());
    }
}
