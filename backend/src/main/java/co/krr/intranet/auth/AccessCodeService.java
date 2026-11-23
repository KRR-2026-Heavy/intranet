package co.krr.intranet.auth;

import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service
public class AccessCodeService {
    private final String employeeAccessCode;
    private final String adminAccessCode;

    public AccessCodeService(
            @Value("${KRR_EMPLOYEE_ACCESS_CODE:}") String employeeAccessCode,
            @Value("${KRR_ADMIN_ACCESS_CODE:}") String adminAccessCode) {
        this.employeeAccessCode = employeeAccessCode;
        this.adminAccessCode = adminAccessCode;
    }

    public boolean isValid(String role, String suppliedCode) {
        String expectedCode = role.equals("ADMIN")
                ? adminAccessCode
                : employeeAccessCode;
        if (expectedCode == null || expectedCode.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Login service is not configured. Contact the administrator.");
        }

        return MessageDigest.isEqual(
                expectedCode.getBytes(StandardCharsets.UTF_8),
                suppliedCode.getBytes(StandardCharsets.UTF_8));
    }
}
