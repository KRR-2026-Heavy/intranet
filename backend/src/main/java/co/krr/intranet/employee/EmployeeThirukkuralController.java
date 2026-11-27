package co.krr.intranet.employee;

import co.krr.intranet.content.ThirukkuralCollectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.sql.SQLException;

@RestController
@RequestMapping("/api/employee")
public class EmployeeThirukkuralController {
    private final ThirukkuralCollectionService service;

    public EmployeeThirukkuralController(ThirukkuralCollectionService service) {
        this.service = service;
    }

    @GetMapping("/thirukkural")
    public ResponseEntity<ThirukkuralCollectionService.EmployeeCouplet> currentCouplet() {
        try {
            ThirukkuralCollectionService.EmployeeCouplet current = service.currentCouplet();
            return current == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(current);
        } catch (SQLException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "The published Thirukkural could not be loaded from SQL Server.", exception);
        }
    }
}
