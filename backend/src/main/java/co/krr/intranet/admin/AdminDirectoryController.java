package co.krr.intranet.admin;

import co.krr.intranet.people.EmployeeManagementService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminDirectoryController {
    private final EmployeeManagementService employeeManagementService;

    public AdminDirectoryController(EmployeeManagementService employeeManagementService) {
        this.employeeManagementService = employeeManagementService;
    }

    @GetMapping("/employees")
    public EmployeeManagementService.EmployeeCollection employees() {
        return employeeManagementService.employeesForAdmin();
    }

    @PostMapping("/employees")
    public ResponseEntity<EmployeeManagementService.EmployeeProfile> createEmployee(
            @Valid @RequestBody EmployeeManagementService.EmployeeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(employeeManagementService.createEmployee(request));
    }

    @PutMapping("/employees/{id}")
    public EmployeeManagementService.EmployeeProfile updateEmployee(
            @PathVariable long id,
            @Valid @RequestBody EmployeeManagementService.EmployeeRequest request) {
        return employeeManagementService.updateEmployee(id, request);
    }

    @DeleteMapping("/employees/{id}")
    public ResponseEntity<Void> deactivateEmployee(@PathVariable long id) {
        employeeManagementService.deactivateEmployee(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/departments")
    public EmployeeManagementService.DepartmentCollection departments() {
        return employeeManagementService.departmentsForAdmin();
    }

    @PutMapping("/departments/{id}")
    public EmployeeManagementService.DepartmentManagementItem updateDepartment(
            @PathVariable String id,
            @Valid @RequestBody DepartmentOverviewRequest request) {
        return employeeManagementService.updateDepartmentOverview(id, request.overview());
    }

    public record DepartmentOverviewRequest(@Size(max = 2000) String overview) {
    }
}
