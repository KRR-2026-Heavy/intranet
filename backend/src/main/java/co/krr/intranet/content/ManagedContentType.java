package co.krr.intranet.content;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public enum ManagedContentType {
    ANNOUNCEMENTS("announcements"),
    THOUGHTS("thoughts"),
    NOTICES("notices"),
    MEETINGS("meetings"),
    HOLIDAYS("holidays"),
    POLICIES("policies");

    private final String slug;

    ManagedContentType(String slug) {
        this.slug = slug;
    }

    public String slug() {
        return slug;
    }

    public static ManagedContentType fromSlug(String slug) {
        for (ManagedContentType type : values()) {
            if (type.slug.equals(slug)) {
                return type;
            }
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown content category.");
    }
}
