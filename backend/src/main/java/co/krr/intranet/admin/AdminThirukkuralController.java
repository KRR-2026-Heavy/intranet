package co.krr.intranet.admin;

import co.krr.intranet.content.ThirukkuralCollectionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.sql.SQLException;
import java.util.List;

@RestController
@RequestMapping("/api/admin/thirukkural-collection")
public class AdminThirukkuralController {
    private final ThirukkuralCollectionService service;

    public AdminThirukkuralController(ThirukkuralCollectionService service) {
        this.service = service;
    }

    @GetMapping
    public ThirukkuralCollectionService.AdminCollection getCollection() {
        try {
            return service.adminCollection();
        } catch (SQLException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "The Thirukkural collection could not be loaded from SQL Server.", exception);
        }
    }

    @PutMapping
    public ThirukkuralCollectionService.AdminCollection publish(@Valid @RequestBody PublishRequest request) {
        try {
            return service.publish(request.couplets());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
        } catch (SQLException | IllegalStateException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "The Thirukkural collection could not be saved to SQL Server.", exception);
        }
    }

    public record PublishRequest(@Size(min = 10, max = 10) List<ThirukkuralCollectionService.KuralText> couplets) {}
}
