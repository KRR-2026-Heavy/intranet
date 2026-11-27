package co.krr.intranet.config;

import jakarta.servlet.DispatcherType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class SecurityConfig {
    @Value("${krr.cors.allowed-origin-patterns}")
    private String allowedOriginPatterns;

    @Value("${krr.session.cookie.same-site}")
    private String cookieSameSite;

    @Value("${krr.session.cookie.secure}")
    private boolean secureCookies;

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.stream(allowedOriginPatterns.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList());
        configuration.setAllowedMethods(List.of(
                HttpMethod.GET.name(),
                HttpMethod.POST.name(),
                HttpMethod.PUT.name(),
                HttpMethod.DELETE.name(),
                HttpMethod.OPTIONS.name()));
        configuration.setAllowedHeaders(List.of(
                "Accept",
                "Content-Type",
                "X-XSRF-TOKEN"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfTokenRepository.setCookiePath("/");
        csrfTokenRepository.setCookieCustomizer(cookie -> cookie
                .sameSite(cookieSameSite)
                .secure(secureCookies));
        return http
                .cors(Customizer.withDefaults())
                .headers(headers -> headers.frameOptions(frameOptions -> frameOptions.sameOrigin()))
                .csrf(csrf -> csrf.ignoringRequestMatchers(
                        "/api/auth/login",
                        "/api/auth/logout")
                        .csrfTokenRepository(csrfTokenRepository))
                .authorizeHttpRequests(authorize -> authorize
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers("/api/auth/login", "/api/auth/logout").permitAll()
                        .requestMatchers("/api/auth/session").authenticated()
                        .requestMatchers("/api/employee/**").hasRole("EMPLOYEE")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .securityContext(context -> context
                        .securityContextRepository(new HttpSessionSecurityContextRepository()))
                .build();
    }
}
