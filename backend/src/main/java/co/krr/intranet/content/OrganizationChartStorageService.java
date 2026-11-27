package co.krr.intranet.content;

import com.fasterxml.jackson.databind.ObjectMapper;
import co.krr.intranet.content.OrganizationChartFileValidator.ValidatedChart;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class OrganizationChartStorageService {
    private final Path storageDirectory;
    private final ObjectMapper objectMapper;
    private final OrganizationChartFileValidator validator;

    public OrganizationChartStorageService(
            @Value("${krr.organization-chart.storage-directory}") String storageDirectory,
            ObjectMapper objectMapper,
            OrganizationChartFileValidator validator) {
        this.storageDirectory = Path.of(storageDirectory).toAbsolutePath().normalize();
        this.objectMapper = objectMapper;
        this.validator = validator;
    }

    public List<ChartMetadata> metadata() {
        return List.of(metadata(1), metadata(2));
    }

    public ChartMetadata metadata(int page) {
        validatePage(page);
        try {
            ChartManifest manifest = readManifest(page);
            if (manifest != null) {
                return new ChartMetadata(page, manifest.originalFilename(), manifest.lastUpdated(),
                        manifest.fileSize(), false);
            }
            ClassPathResource original = originalResource(page);
            return new ChartMetadata(page, "chart" + page + ".pdf", null,
                    original.contentLength(), true);
        } catch (IOException exception) {
            throw storageError(exception);
        }
    }

    public StoredChart file(int page) {
        validatePage(page);
        try {
            ChartManifest manifest = readManifest(page);
            if (manifest != null) {
                Path storedFile = storageDirectory.resolve(manifest.storedFilename()).normalize();
                if (!storedFile.getParent().equals(storageDirectory) || !Files.isRegularFile(storedFile)) {
                    throw new IOException("The current organization chart file is missing.");
                }
                return new StoredChart(Files.readAllBytes(storedFile), manifest.originalFilename());
            }
            ClassPathResource original = originalResource(page);
            if (!original.exists()) throw new ResponseStatusException(NOT_FOUND, "Organization chart not found.");
            return new StoredChart(original.getContentAsByteArray(), "chart" + page + ".pdf");
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (IOException exception) {
            throw storageError(exception);
        }
    }

    public ChartMetadata replace(int page, MultipartFile upload) {
        validatePage(page);
        ValidatedChart chart = validator.validate(upload);
        Path dataTemp = null;
        Path manifestTemp = null;
        String newStoredFilename = "chart" + page + "-" + UUID.randomUUID() + ".pdf";
        Path newStoredFile = storageDirectory.resolve(newStoredFilename);
        ChartManifest previous = null;
        try {
            Files.createDirectories(storageDirectory);
            previous = readManifest(page);
            dataTemp = Files.createTempFile(storageDirectory, "chart" + page + "-", ".upload");
            Files.write(dataTemp, chart.content());
            moveReplacing(dataTemp, newStoredFile);
            dataTemp = null;

            ChartManifest next = new ChartManifest(
                    newStoredFilename,
                    chart.filename(),
                    OffsetDateTime.now(ZoneOffset.UTC),
                    chart.content().length);
            manifestTemp = Files.createTempFile(storageDirectory, "chart" + page + "-", ".metadata");
            objectMapper.writeValue(manifestTemp.toFile(), next);
            moveReplacing(manifestTemp, manifestPath(page));
            manifestTemp = null;

            if (previous != null) {
                deleteQuietly(storageDirectory.resolve(previous.storedFilename()).normalize());
            }
            return new ChartMetadata(page, next.originalFilename(), next.lastUpdated(), next.fileSize(), false);
        } catch (IOException exception) {
            deleteQuietly(newStoredFile);
            throw storageError(exception);
        } finally {
            deleteQuietly(dataTemp);
            deleteQuietly(manifestTemp);
        }
    }

    private ChartManifest readManifest(int page) throws IOException {
        Path manifestFile = manifestPath(page);
        if (!Files.exists(manifestFile)) return null;
        ChartManifest manifest = objectMapper.readValue(manifestFile.toFile(), ChartManifest.class);
        String expectedPrefix = "chart" + page + "-";
        if (manifest.storedFilename() == null || !manifest.storedFilename().startsWith(expectedPrefix)
                || !manifest.storedFilename().endsWith(".pdf")
                || !Path.of(manifest.storedFilename()).getFileName().toString().equals(manifest.storedFilename())) {
            throw new IOException("The organization chart metadata is invalid.");
        }
        return manifest;
    }

    private Path manifestPath(int page) {
        return storageDirectory.resolve("chart" + page + ".json");
    }

    private ClassPathResource originalResource(int page) {
        return new ClassPathResource("organization-charts/chart" + page + ".pdf");
    }

    private void validatePage(int page) {
        if (page < 1 || page > 2) throw new ResponseStatusException(NOT_FOUND, "Organization chart not found.");
    }

    private void moveReplacing(Path source, Path destination) throws IOException {
        try {
            Files.move(source, destination, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (AtomicMoveNotSupportedException exception) {
            Files.move(source, destination, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private void deleteQuietly(Path path) {
        if (path == null) return;
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
            // The main operation already reports failures; temporary files are harmless on cleanup errors.
        }
    }

    private ResponseStatusException storageError(IOException exception) {
        return new ResponseStatusException(INTERNAL_SERVER_ERROR, "Organization chart storage is unavailable.", exception);
    }

    private record ChartManifest(String storedFilename, String originalFilename,
                                 OffsetDateTime lastUpdated, long fileSize) {}

    public record ChartMetadata(int page, String filename, OffsetDateTime lastUpdated,
                                long fileSize, boolean bundledOriginal) {}

    public record StoredChart(byte[] content, String filename) {}
}
