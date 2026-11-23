package co.krr.intranet.admin;

import co.krr.intranet.content.ManagedContent;
import co.krr.intranet.content.ManagedContentService;
import co.krr.intranet.content.ManagedContentType;
import jakarta.validation.Valid;
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
@RequestMapping("/api/admin/content")
public class AdminContentController {
    private final ManagedContentService contentService;

    public AdminContentController(ManagedContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping("/{category}")
    public ContentCollection list(@PathVariable String category) {
        ManagedContentType type = ManagedContentType.fromSlug(category);
        return new ContentCollection(
                contentService.isConfigured(),
                contentService.list(type),
                contentService.isConfigured() ? null : contentService.unavailableMessage());
    }

    @PostMapping("/{category}")
    public ResponseEntity<ManagedContent> create(
            @PathVariable String category,
            @Valid @RequestBody ManagedContent.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                contentService.create(ManagedContentType.fromSlug(category), request));
    }

    @PutMapping("/{category}/{id}")
    public ManagedContent update(
            @PathVariable String category,
            @PathVariable long id,
            @Valid @RequestBody ManagedContent.Request request) {
        return contentService.update(ManagedContentType.fromSlug(category), id, request);
    }

    @DeleteMapping("/{category}/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable String category,
            @PathVariable long id) {
        contentService.delete(ManagedContentType.fromSlug(category), id);
        return ResponseEntity.noContent().build();
    }

    public record ContentCollection(
            boolean storageConfigured,
            java.util.List<ManagedContent> items,
            String unavailableMessage) {
    }
}
