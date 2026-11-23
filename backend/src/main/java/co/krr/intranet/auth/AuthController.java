package co.krr.intranet.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final String EMPLOYEE_ROLE = "EMPLOYEE";
    private static final String ADMIN_ROLE = "ADMIN";

    private final AccessCodeService accessCodeService;

    public AuthController(AccessCodeService accessCodeService) {
        this.accessCodeService = accessCodeService;
    }

    @PostMapping("/login")
    public LoginResponse login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest) {
        String role = request.role().toUpperCase();
        if (!EMPLOYEE_ROLE.equals(role) && !ADMIN_ROLE.equals(role)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid login role.");
        }

        if (!accessCodeService.isValid(role, request.accessCode())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access code.");
        }

        var user = new AuthUser(
                role.equals(ADMIN_ROLE) ? "administrator" : "employee",
                role.equals(ADMIN_ROLE) ? "Administrator" : "Employee",
                role);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                user,
                null,
                java.util.List.of(new SimpleGrantedAuthority("ROLE_" + role)));

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        servletRequest.getSession(true).setMaxInactiveInterval(1800);
        servletRequest.getSession().setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                context);

        return new LoginResponse(user, Instant.now().plusSeconds(1800).toString());
    }

    @GetMapping("/session")
    public LoginResponse session(Authentication authentication) {
        AuthUser user = (AuthUser) authentication.getPrincipal();
        return new LoginResponse(user, Instant.now().plusSeconds(1800).toString());
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken csrfToken) {
        return Map.of("token", csrfToken.getToken());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            jakarta.servlet.http.HttpServletResponse response,
            Authentication authentication) {
        new SecurityContextLogoutHandler().logout(request, response, authentication);
        return ResponseEntity.noContent().build();
    }

    public record LoginRequest(
            @NotBlank String role,
            @NotBlank String accessCode) {
    }

    public record AuthUser(String id, String name, String role) {
    }

    public record LoginResponse(AuthUser user, String expiresAt) {
    }
}
