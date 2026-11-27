package co.krr.intranet.content;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public enum PolicyDocumentSection {
    POLICIES("policies", "Policies"),
    PROCEDURE("procedure", "Procedure"),
    COMMITTEE("committee", "Committee"),
    SOPS("sops", "SOP's"),
    PROCESS_FLOW_CHART("process-flow-chart", "Process Flow Chart");

    private final String slug;
    private final String label;

    PolicyDocumentSection(String slug, String label) {
        this.slug = slug;
        this.label = label;
    }

    public String slug() {
        return slug;
    }

    public String label() {
        return label;
    }

    public static PolicyDocumentSection fromSlug(String slug) {
        for (PolicyDocumentSection section : values()) {
            if (section.slug.equalsIgnoreCase(slug)) return section;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid policy section.");
    }
}
