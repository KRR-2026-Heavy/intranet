package co.krr.intranet.employee;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import java.time.LocalDate;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "KRR_EMPLOYEE_ACCESS_CODE=test-employee-code",
        "KRR_ADMIN_ACCESS_CODE=test-admin-code"
})
@AutoConfigureMockMvc
class EmployeeContentControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void holidayListRemovesOnlyDuplicateNamesForTheSameOccurrence() {
        List<EmployeeContentController.Holiday> holidays = EmployeeContentController.distinctHolidays(List.of(
                new EmployeeContentController.Holiday("Pongal", 2026, LocalDate.of(2026, 1, 14), null),
                new EmployeeContentController.Holiday(" pongal ", 2026, LocalDate.of(2026, 1, 14), null),
                new EmployeeContentController.Holiday("Pongal", 2027, LocalDate.of(2027, 1, 14), null),
                new EmployeeContentController.Holiday("Pongal", null, null, null),
                new EmployeeContentController.Holiday("Pongal", null, null, null)));

        org.junit.jupiter.api.Assertions.assertEquals(3, holidays.size());
    }

    @Test
    void employeeCanReadSuppliedDepartmentAndHolidayCatalogues() throws Exception {
        MockHttpSession employeeSession = login("EMPLOYEE", "test-employee-code");

        mockMvc.perform(get("/api/employee/departments").session(employeeSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(16))
                .andExpect(jsonPath("$[0].id").value("store"))
                .andExpect(jsonPath("$[0].name").value("Store"))
                .andExpect(jsonPath("$[0].employees.length()").value(0))
                .andExpect(jsonPath("$[1].id").value("production"))
                .andExpect(jsonPath("$[2].id").value("quality"))
                .andExpect(jsonPath("$[3].id").value("maintenance"))
                .andExpect(jsonPath("$[4].id").value("hr-admin"))
                .andExpect(jsonPath("$[5].id").value("safety"))
                .andExpect(jsonPath("$[6].id").value("auto-clave"))
                .andExpect(jsonPath("$[7].id").value("dished-end"))
                .andExpect(jsonPath("$[8].id").value("business-systems-developments"))
                .andExpect(jsonPath("$[9].id").value("purchase"))
                .andExpect(jsonPath("$[10].id").value("sales-proposal"))
                .andExpect(jsonPath("$[11].id").value("design-team"))
                .andExpect(jsonPath("$[12].id").value("business-development"))
                .andExpect(jsonPath("$[13].id").value("project-team"))
                .andExpect(jsonPath("$[14].id").value("planning-team"))
                .andExpect(jsonPath("$[15].id").value("site-execution"))
                .andExpect(jsonPath("$[15].name").value("Site Execution"));

        mockMvc.perform(get("/api/employee/holidays").session(employeeSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void organizationAndMeetingDataUseOnlySuppliedInformation() throws Exception {
        MockHttpSession employeeSession = login("EMPLOYEE", "test-employee-code");

        mockMvc.perform(get("/api/employee/organization").session(employeeSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leadership.length()").value(4))
                .andExpect(jsonPath("$.leadership[2].name").value("AVP - Mr. S. Karthikesan"))
                .andExpect(jsonPath("$.teams[2].name").value("Proposal & Estimation – General Engineering: Head"))
                .andExpect(jsonPath("$.teams[0].people[1].name").value("C. Sathishkumar"))
                .andExpect(jsonPath("$.teams[3].people[0].name").value("Santhosh Kumar"));

        mockMvc.perform(get("/api/employee/meetings").session(employeeSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void adminCannotReadEmployeeOnlyApi() throws Exception {
        MockHttpSession adminSession = login("ADMIN", "test-admin-code");
        mockMvc.perform(get("/api/employee/departments").session(adminSession))
                .andExpect(status().isForbidden());
    }

    @Test
    void employeeManagementApisAreAdminOnlyAndReportUnavailableStorageHonestly() throws Exception {
        MockHttpSession employeeSession = login("EMPLOYEE", "test-employee-code");
        mockMvc.perform(get("/api/admin/employees").session(employeeSession))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/departments").session(employeeSession))
                .andExpect(status().isForbidden());

        MockHttpSession adminSession = login("ADMIN", "test-admin-code");
        mockMvc.perform(get("/api/admin/employees").session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.storageConfigured").value(false))
                .andExpect(jsonPath("$.items.length()").value(0));
        mockMvc.perform(get("/api/admin/departments").session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.storageConfigured").value(false))
                .andExpect(jsonPath("$.items.length()").value(16));

        mockMvc.perform(post("/api/admin/employees")
                        .session(adminSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeCode": "EMP-001",
                                  "fullName": "Kumar R",
                                  "jobTitle": "Engineer",
                                  "departmentId": "production",
                                  "active": true,
                                  "departmentHead": false
                                }
                                """))
                .andExpect(status().isServiceUnavailable());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                        "/api/admin/departments/production")
                        .session(adminSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"overview\":\"Department overview\"}"))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void dashboardDoesNotReportAnInventedEmployeeCount() throws Exception {
        MockHttpSession employeeSession = login("EMPLOYEE", "test-employee-code");
        mockMvc.perform(get("/api/employee/overview").session(employeeSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeProfiles").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.departments").value(16));
    }

    @Test
    void employeeCanReadPrivacyPolicyButAdminCannotReadEmployeePolicyApi() throws Exception {
        MockHttpSession employeeSession = login("EMPLOYEE", "test-employee-code");
        mockMvc.perform(get("/api/employee/policy").session(employeeSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.effectiveDate").value("01-01-2026"))
                .andExpect(jsonPath("$.published").value(true))
                .andExpect(jsonPath("$.sections[0].title").value("Privacy Policy – KRR Engineering"))
                .andExpect(jsonPath("$.sections[0].effectiveDate").value("01-01-2026"))
                .andExpect(jsonPath("$.sections[0].content").value(
                        org.hamcrest.Matchers.containsString(
                                "1. Information Collection: We may collect names, email addresses, phone numbers, employee details and website usage information.")))
                .andExpect(jsonPath("$.sections[0].content").value(
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("DRAFT"))));

        MockHttpSession adminSession = login("ADMIN", "test-admin-code");
        mockMvc.perform(get("/api/employee/policy").session(adminSession))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanReadOverviewWithUnavailableDatabaseMetricsClearlyNull() throws Exception {
        MockHttpSession adminSession = login("ADMIN", "test-admin-code");
        mockMvc.perform(get("/api/admin/overview").session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.storageConfigured").value(false))
                .andExpect(jsonPath("$.categories.announcements.published").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.categories.announcements.drafts").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.categories.thoughts.scheduled").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.categories.policies.published").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.unavailableMessage").value(
                        "Microsoft SQL Server is not configured; content cannot be saved or published."));
    }

    @Test
    void adminGetsHonestEmptyContentCollectionWhenSqlServerIsNotConfigured() throws Exception {
        MockHttpSession adminSession = login("ADMIN", "test-admin-code");
        mockMvc.perform(get("/api/admin/content/announcements").session(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.storageConfigured").value(false))
                .andExpect(jsonPath("$.items.length()").value(0))
                .andExpect(jsonPath("$.unavailableMessage").exists());
    }

    @Test
    void adminCannotClaimContentWasSavedWithoutSqlServer() throws Exception {
        MockHttpSession adminSession = login("ADMIN", "test-admin-code");
        mockMvc.perform(post("/api/admin/content/announcements")
                        .session(adminSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Test announcement",
                                  "body": "Test content",
                                  "status": "PUBLISHED",
                                  "scheduledAt": null
                                }
                                """))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value(
                        "Microsoft SQL Server is not configured; content cannot be saved or published."));
    }

    @Test
    void employeeCannotReadAdminOverview() throws Exception {
        MockHttpSession employeeSession = login("EMPLOYEE", "test-employee-code");
        mockMvc.perform(get("/api/admin/overview").session(employeeSession))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/content/announcements").session(employeeSession))
                .andExpect(status().isForbidden());
    }

    @Test
    void unsavedLeaveApplicationsAreNotReportedAsAccepted() throws Exception {
        MockHttpSession employeeSession = login("EMPLOYEE", "test-employee-code");
        MockMultipartHttpServletRequestBuilder request = multipart("/api/employee/leave-applications")
                .file(part("employeeName", "Test Employee"))
                .file(part("department", "Production"))
                .file(part("leaveType", "Casual Leave"))
                .file(part("fromDate", "2026-12-01"))
                .file(part("toDate", "2026-12-01"))
                .file(part("numberOfDays", "1"))
                .file(part("reason", "Test application"));
        request.session(employeeSession);
        request.with(csrf());
        mockMvc.perform(request)
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value(
                        "Leave applications cannot be stored until Microsoft SQL Server is configured."));
    }

    private MockHttpSession login(String role, String accessCode) throws Exception {
        return (MockHttpSession) mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"" + role + "\",\"accessCode\":\"" + accessCode + "\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getRequest()
                .getSession(false);
    }

    private MockMultipartFile part(String name, String value) {
        return new MockMultipartFile(name, "", MediaType.TEXT_PLAIN_VALUE, value.getBytes());
    }
}
