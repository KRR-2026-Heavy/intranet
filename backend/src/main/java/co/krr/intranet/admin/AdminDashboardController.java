package co.krr.intranet.admin;

import co.krr.intranet.content.ManagedContentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminDashboardController {
    private final ManagedContentService contentService;

    public AdminDashboardController(ManagedContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping("/overview")
    public AdminDashboardOverview overview() {
        return new AdminDashboardOverview(
                contentService.isConfigured(),
                contentService.counts(),
                contentService.isConfigured() ? null : contentService.unavailableMessage());
    }

    public record AdminDashboardOverview(
            boolean storageConfigured,
            java.util.Map<String, ManagedContentService.CategoryCounts> categories,
            String unavailableMessage) {
    }
}
