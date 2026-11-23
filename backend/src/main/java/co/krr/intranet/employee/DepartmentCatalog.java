package co.krr.intranet.employee;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DepartmentCatalog {
    private static final String DEPARTMENT_OVERVIEW_PENDING =
            "Department overview has not been published.";

    private final List<Department> departments = List.of(
            new Department("store", "Store", "shelves", DEPARTMENT_OVERVIEW_PENDING),
            new Department("production", "Production", "factory", DEPARTMENT_OVERVIEW_PENDING),
            new Department("quality", "Quality", "inspection", DEPARTMENT_OVERVIEW_PENDING),
            new Department("maintenance", "Maintenance", "gear", DEPARTMENT_OVERVIEW_PENDING),
            new Department("hr-admin", "HR & Admin", "corporate", DEPARTMENT_OVERVIEW_PENDING),
            new Department("safety", "Safety", "safety", DEPARTMENT_OVERVIEW_PENDING),
            new Department("auto-clave", "Auto Clave", "vessel", DEPARTMENT_OVERVIEW_PENDING),
            new Department("dished-end", "Dished End", "curved-metal", DEPARTMENT_OVERVIEW_PENDING),
            new Department("business-systems-developments", "Business Systems Developments", "digital-grid", DEPARTMENT_OVERVIEW_PENDING),
            new Department("purchase", "Purchase", "supply-chain", DEPARTMENT_OVERVIEW_PENDING),
            new Department("sales-proposal", "Sales and Proposal", "technical-documents", DEPARTMENT_OVERVIEW_PENDING),
            new Department("design-team", "Design Team", "cad", DEPARTMENT_OVERVIEW_PENDING),
            new Department("business-development", "Business Development", "growth", DEPARTMENT_OVERVIEW_PENDING),
            new Department("project-team", "Project Team", "structure", DEPARTMENT_OVERVIEW_PENDING),
            new Department("planning-team", "Planning Team", "schedule", DEPARTMENT_OVERVIEW_PENDING),
            new Department("site-execution", "Site Execution", "construction", DEPARTMENT_OVERVIEW_PENDING));

    public List<Department> all() {
        return departments;
    }

    public record Department(String id, String name, String graphic, String overview) {
    }
}
