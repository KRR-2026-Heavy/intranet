package co.krr.intranet.employee;

import co.krr.intranet.admin.AdminPolicyDocumentController;
import co.krr.intranet.content.PolicyDocumentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/employee/policy-documents")
public class EmployeePolicyDocumentController {
    private final PolicyDocumentService documents;

    public EmployeePolicyDocumentController(PolicyDocumentService documents) {
        this.documents = documents;
    }

    @GetMapping
    public PolicyDocumentService.PolicyDocumentCollection list(
            @RequestParam(value = "section", required = false) String section) {
        return documents.published(section);
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<byte[]> file(
            @PathVariable long id,
            @RequestParam(defaultValue = "false") boolean download) {
        return AdminPolicyDocumentController.fileResponse(documents.file(id, true), download);
    }
}
