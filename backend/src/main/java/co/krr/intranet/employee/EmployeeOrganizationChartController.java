package co.krr.intranet.employee;

import co.krr.intranet.content.OrganizationChartStorageService;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/employee/organization-charts")
public class EmployeeOrganizationChartController {
    private final OrganizationChartStorageService charts;

    public EmployeeOrganizationChartController(OrganizationChartStorageService charts) {
        this.charts = charts;
    }

    @GetMapping(value = "/{page}", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> chart(
            @PathVariable int page,
            @RequestParam(defaultValue = "false") boolean download) {
        OrganizationChartStorageService.StoredChart chart = charts.file(page);
        ContentDisposition disposition = (download ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(chart.filename(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(chart.content().length)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore())
                .body(chart.content());
    }
}
