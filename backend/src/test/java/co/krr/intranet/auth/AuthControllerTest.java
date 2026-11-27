package co.krr.intranet.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "KRR_EMPLOYEE_ACCESS_CODE=test-employee-code",
        "KRR_ADMIN_ACCESS_CODE=test-admin-code"
})
@AutoConfigureMockMvc
class AuthControllerTest {
    private static final String[] FRONTEND_ORIGINS = {
            "https://intranet-ezpy.vercel.app",
            "http://localhost:5173",
            "http://127.0.0.1:5173"
    };

    @Autowired
    private MockMvc mockMvc;

    @Test
    void allowsCredentialedCorsRequestsFromConfiguredFrontendOrigins() throws Exception {
        for (String origin : FRONTEND_ORIGINS) {
            mockMvc.perform(options("/api/auth/login")
                            .header("Origin", origin)
                            .header("Access-Control-Request-Method", "POST")
                            .header("Access-Control-Request-Headers", "content-type"))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Access-Control-Allow-Origin", origin))
                    .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
        }
    }

    @Test
    void acceptsEmployeeAccessCodeAndPersistsSession() throws Exception {
        MockHttpSession session = (MockHttpSession) mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"EMPLOYEE\",\"accessCode\":\"test-employee-code\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("EMPLOYEE"))
                .andReturn()
                .getRequest()
                .getSession(false);

        mockMvc.perform(get("/api/auth/session").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("EMPLOYEE"));
    }

    @Test
    void rejectsIncorrectEmployeeAccessCode() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"EMPLOYEE\",\"accessCode\":\"wrong-code\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid access code."));
    }

    @Test
    void acceptsAdminAccessCodeAndPersistsAdminRole() throws Exception {
        MockHttpSession session = (MockHttpSession) mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\",\"accessCode\":\"test-admin-code\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("ADMIN"))
                .andReturn()
                .getRequest()
                .getSession(false);

        mockMvc.perform(get("/api/auth/session").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("ADMIN"));
    }

    @Test
    void employeeAccessCodeCannotAuthenticateAsAdmin() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\",\"accessCode\":\"test-employee-code\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid access code."));
    }
}
