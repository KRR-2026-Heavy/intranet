package co.krr.intranet.admin;

import co.krr.intranet.content.PolicyDocumentService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/admin/policy-documents")
public class AdminPolicyDocumentController {
    private final PolicyDocumentService documents;

    public AdminPolicyDocumentController(PolicyDocumentService documents) {
        this.documents = documents;
    }

    @GetMapping
    public PolicyDocumentService.PolicyDocumentCollection list() {
        return documents.adminCollection();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PolicyDocumentService.PolicyDocument> create(
            @RequestParam("section") @NotBlank String section,
            @RequestParam("title") @NotBlank String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("status") @NotBlank String status,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documents.create(section, title, description, status, file));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PolicyDocumentService.PolicyDocument update(
            @PathVariable long id,
            @RequestParam("section") @NotBlank String section,
            @RequestParam("title") @NotBlank String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("status") @NotBlank String status,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        return documents.update(id, section, title, description, status, file);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        documents.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<byte[]> file(
            @PathVariable long id,
            @RequestParam(defaultValue = "false") boolean download) {
        PolicyDocumentService.StoredFile stored = documents.file(id, false);
        return fileResponse(stored, download);
    }

    public static ResponseEntity<byte[]> fileResponse(PolicyDocumentService.StoredFile stored, boolean download) {
        PolicyDocumentService.PolicyDocument document = stored.document();
        boolean inline = !download && (document.mediaType().equals("application/pdf")
                || document.mediaType().startsWith("image/"));
        ContentDisposition disposition = (inline ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(document.originalFileName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(document.mediaType()))
                .contentLength(stored.bytes().length)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore())
                .body(stored.bytes());
    }
}
