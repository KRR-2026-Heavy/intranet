package co.krr.intranet.admin;

import co.krr.intranet.content.OrganizationChartStorageService;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/admin/organization-charts")
public class AdminOrganizationChartController {
    private final OrganizationChartStorageService charts;

    public AdminOrganizationChartController(OrganizationChartStorageService charts) {
        this.charts = charts;
    }

    @GetMapping
    public List<OrganizationChartStorageService.ChartMetadata> list() {
        return charts.metadata();
    }

    @GetMapping(value = "/{page}/file", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> chart(
            @PathVariable int page,
            @RequestParam(defaultValue = "false") boolean download) {
        return fileResponse(charts.file(page), download);
    }

    @PutMapping(value = "/{page}/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<OrganizationChartStorageService.ChartMetadata> replace(
            @PathVariable int page,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.OK).body(charts.replace(page, file));
    }

    private ResponseEntity<byte[]> fileResponse(OrganizationChartStorageService.StoredChart chart, boolean download) {
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
