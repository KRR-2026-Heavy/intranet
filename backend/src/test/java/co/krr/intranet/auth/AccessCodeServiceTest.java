package co.krr.intranet.auth;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AccessCodeServiceTest {
    @Test
    void acceptsOnlyConfiguredRoleCode() {
        AccessCodeService service = new AccessCodeService("test-employee-code", "test-admin-code");
        assertTrue(service.isValid("EMPLOYEE", "test-employee-code"));
        assertFalse(service.isValid("EMPLOYEE", "wrong-code"));
        assertFalse(service.isValid("ADMIN", "test-employee-code"));
    }
}
