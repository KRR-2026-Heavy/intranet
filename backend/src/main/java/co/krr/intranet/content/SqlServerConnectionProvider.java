package co.krr.intranet.content;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

@Component
public class SqlServerConnectionProvider {
    private final String url;
    private final String username;
    private final String password;

    public SqlServerConnectionProvider(
            @Value("${KRR_SQLSERVER_URL:}") String url,
            @Value("${KRR_SQLSERVER_USERNAME:}") String username,
            @Value("${KRR_SQLSERVER_PASSWORD:}") String password) {
        this.url = url;
        this.username = username;
        this.password = password;
    }

    public boolean isConfigured() {
        return url != null && !url.isBlank();
    }

    public Connection openConnection() throws SQLException {
        if (!isConfigured()) {
            throw new IllegalStateException("SQL Server is not configured.");
        }
        if (username == null || username.isBlank()) {
            return DriverManager.getConnection(url);
        }
        return DriverManager.getConnection(url, username, password);
    }
}
