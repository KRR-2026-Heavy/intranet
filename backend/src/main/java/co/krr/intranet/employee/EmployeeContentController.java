package co.krr.intranet.employee;

import co.krr.intranet.content.ManagedContent;
import co.krr.intranet.content.ManagedContentService;
import co.krr.intranet.content.ManagedContentType;
import co.krr.intranet.people.EmployeeManagementService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@RestController
@RequestMapping("/api/employee")
public class EmployeeContentController {
    private final EmployeeManagementService employeeManagementService;
    private final ManagedContentService contentService;

    public EmployeeContentController(
            EmployeeManagementService employeeManagementService,
            ManagedContentService contentService) {
        this.employeeManagementService = employeeManagementService;
        this.contentService = contentService;
    }

    @GetMapping("/departments")
    public List<EmployeeManagementService.EmployeeDepartment> departments() {
        return employeeManagementService.departmentsForEmployees();
    }

    @GetMapping("/announcements")
    public List<PublishedContent> announcements() {
        return publishedContent(ManagedContentType.ANNOUNCEMENTS);
    }

    @GetMapping("/notices")
    public List<PublishedContent> notices() {
        return publishedContent(ManagedContentType.NOTICES);
    }

    @GetMapping("/monthly-thought")
    public ResponseEntity<MonthlyThought> monthlyThought() {
        List<ManagedContent> thoughts = contentService.published(ManagedContentType.THOUGHTS);
        if (thoughts != null && !thoughts.isEmpty()) {
            LocalDate currentMonth = LocalDate.now().withDayOfMonth(1);
            ManagedContent thought = thoughts.stream()
                    .filter(item -> currentMonth.equals(item.thoughtMonth()))
                    .findFirst()
                    .orElse(null);
            if (thought == null) return ResponseEntity.noContent().build();
            Month month = thought.thoughtMonth().getMonth();
            return ResponseEntity.ok(new MonthlyThought(
                    month.getDisplayName(TextStyle.FULL, Locale.ENGLISH),
                    thought.thoughtMonth().getYear(),
                    thought.title(),
                    thought.body(),
                    thought.author()));
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/meetings")
    public List<Meeting> meetings() {
        List<ManagedContent> published = contentService.published(ManagedContentType.MEETINGS);
        if (published != null) {
            return published.stream()
                    .map(item -> new Meeting(
                            item.title(),
                            null,
                            item.eventDate(),
                            item.time(),
                            item.location(),
                            item.body()))
                    .toList();
        }
        return List.of();
    }

    @GetMapping("/overview")
    public DashboardOverview overview() {
        return new DashboardOverview(
                employeeManagementService.activeEmployeeCount(),
                employeeManagementService.departmentCount(),
                announcements().size(),
                meetings().size());
    }

    @GetMapping("/holidays")
    public List<Holiday> holidays() {
        List<ManagedContent> published = contentService.published(ManagedContentType.HOLIDAYS);
        if (published != null) {
            return distinctHolidays(published.stream()
                    .map(item -> new Holiday(
                            item.title(),
                            item.eventDate() == null ? null : item.eventDate().getYear(),
                            item.eventDate(),
                            item.body()))
                    .toList());
        }
        return List.of();
    }

    @GetMapping("/policy")
    public Policy policy() {
        List<ManagedContent> published = contentService.published(ManagedContentType.POLICIES);
        if (published != null && !published.isEmpty()) {
            List<PolicySection> sections = published.stream()
                    .map(item -> new PolicySection(
                            item.title(),
                            item.body(),
                            item.effectiveDate() == null ? null : item.effectiveDate().toString()))
                    .toList();
            ManagedContent first = published.get(0);
            return new Policy(
                    first.effectiveDate() == null ? null : first.effectiveDate().toString(),
                    sections,
                    true);
        }
        return new Policy(
                "01-01-2026",
                List.of(new PolicySection(
                        "Privacy Policy – KRR Engineering",
                        String.join("\n",
                                "Effective Date: 01-01-2026",
                                "",
                                "KRR Engineering Private Limited is committed to protecting the privacy and security of visitors to its website and intranet portal.",
                                "",
                                "1. Information Collection: We may collect names, email addresses, phone numbers, employee details and website usage information.",
                                "",
                                "2. Use of Information: Information is used for communication, internal administration, employee services and improving website functionality.",
                                "",
                                "3. Cookies: Cookies may be used to improve website performance and user experience.",
                                "",
                                "4. Data Sharing: Personal information will not be sold or rented. It may be shared with authorized internal teams or service providers when necessary.",
                                "",
                                "5. Data Security: We implement reasonable security measures to protect personal and company information from unauthorized access.",
                                "",
                                "6. Data Retention: Information is retained only as long as necessary for business and legal purposes.",
                                "",
                                "7. User Rights: Users may request access to or correction of their personal information, subject to applicable law.",
                                "",
                                "8. Third-Party Links: KRR is not responsible for the privacy practices of external websites.",
                                "",
                                "9. Children's Privacy: Our website is intended for business and professional users.",
                                "",
                                "10. Policy Updates: This policy may be updated when necessary. Changes will be published on the website.",
                                "",
                                "11. Contact Information:",
                                "- Company: KRR Engineering Private Limited",
                                "- Email: info@krr.co.in",
                                "- Website: www.krr.co.in"),
                        "01-01-2026")),
                true);
    }

    @PostMapping(value = "/leave-applications", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> submitLeaveApplication(
            Authentication authentication,
            @RequestPart("employeeName") @NotBlank String employeeName,
            @RequestPart("department") @NotBlank String department,
            @RequestPart("leaveType") @NotBlank String leaveType,
            @RequestPart("fromDate") @NotBlank String fromDate,
            @RequestPart("toDate") @NotBlank String toDate,
            @RequestPart("numberOfDays") @NotBlank String numberOfDays,
            @RequestPart("reason") @NotBlank String reason,
            @RequestPart(value = "attachment", required = false) MultipartFile attachment) {
        throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Leave applications cannot be stored until Microsoft SQL Server is configured.");
    }

    public record DashboardOverview(Integer employeeProfiles, int departments,
                                    int publishedAnnouncements, int currentMeetings) {}
    public record PublishedContent(String id, String title, String description, LocalDate date,
                                   LocalDate expiresOn, String department, String priority, boolean pinned) {}
    public record MonthlyThought(String month, int year, String heading, String message, String author) {}
    public record Meeting(String title, String recurrence, LocalDate date, String time,
                          String location, String agenda) {}
    public record Holiday(String name, Integer year, LocalDate date, String description) {}
    public record PolicySection(String title, String content, String effectiveDate) {}
    public record Policy(String effectiveDate, List<PolicySection> sections, boolean published) {}

    static List<Holiday> distinctHolidays(List<Holiday> holidays) {
        Set<String> seen = new HashSet<>();
        List<Holiday> distinct = new ArrayList<>();
        for (Holiday holiday : holidays) {
            String normalizedName = holiday.name() == null
                    ? ""
                    : holiday.name().trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
            String occurrence = holiday.date() != null
                    ? holiday.date().toString()
                    : holiday.year() == null ? "undated" : holiday.year().toString();
            if (seen.add(normalizedName + "|" + occurrence)) {
                distinct.add(holiday);
            }
        }
        return List.copyOf(distinct);
    }

    private List<PublishedContent> publishedContent(ManagedContentType type) {
        List<ManagedContent> items = contentService.published(type);
        if (items == null) return List.of();
        return items.stream()
                .map(item -> new PublishedContent(
                        Long.toString(item.id()),
                        item.title(),
                        item.body(),
                        item.announcementDate() == null
                                ? contentTimestamp(item).toLocalDate()
                                : item.announcementDate(),
                        item.expiresOn(),
                        item.department(),
                        item.priority(),
                        item.pinned()))
                .toList();
    }

    private java.time.OffsetDateTime contentTimestamp(ManagedContent item) {
        if (item.publishedAt() != null) return item.publishedAt();
        if (item.scheduledAt() != null) return item.scheduledAt();
        return item.createdAt();
    }
}
