package co.krr.intranet.content;

import co.krr.intranet.people.PersonNameFormatter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record ManagedContent(
        long id,
        String category,
        String title,
        String body,
        String status,
        OffsetDateTime scheduledAt,
        OffsetDateTime publishedAt,
        LocalDate announcementDate,
        LocalDate expiresOn,
        LocalDate thoughtMonth,
        String department,
        String priority,
        boolean pinned,
        String author,
        LocalDate eventDate,
        String time,
        String location,
        LocalDate effectiveDate,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public ManagedContent {
        author = PersonNameFormatter.format(author);
    }

    public record Request(
            @NotBlank @Size(max = 250) String title,
            @NotBlank String body,
            @NotBlank String status,
            OffsetDateTime scheduledAt,
            LocalDate announcementDate,
            LocalDate expiresOn,
            LocalDate thoughtMonth,
            @Size(max = 120) String department,
            @Size(max = 16) String priority,
            boolean pinned,
            @Size(max = 120) String author,
            LocalDate eventDate,
            @Size(max = 32) String time,
            @Size(max = 250) String location,
            LocalDate effectiveDate) {
        public Request {
            author = PersonNameFormatter.format(author);
        }
    }
}
