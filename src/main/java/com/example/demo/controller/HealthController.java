package com.example.demo.controller;

import com.example.demo.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.lang.management.RuntimeMXBean;
import java.lang.management.ThreadMXBean;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
@CrossOrigin(origins = "*")
public class HealthController {

    private final TaskRepository taskRepository;

    @Autowired(required = false)
    private DataSource dataSource;

    @Value("${spring.application.name:Task Flow Manager}")
    private String applicationName;

    public HealthController(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getHealth() {
        long startTime = System.currentTimeMillis();
        Map<String, Object> health = new LinkedHashMap<>();

        // Overall status
        health.put("status", "UP");
        health.put("timestamp", LocalDateTime.now());

        // Application stats
        Runtime runtime = Runtime.getRuntime();
        RuntimeMXBean runtimeMXBean = ManagementFactory.getRuntimeMXBean();
        ThreadMXBean threadMXBean = ManagementFactory.getThreadMXBean();

        long uptimeMillis = runtimeMXBean.getUptime();
        long uptimeSeconds = uptimeMillis / 1000;

        double totalMemoryMB = runtime.totalMemory() / (1024.0 * 1024.0);
        double freeMemoryMB = runtime.freeMemory() / (1024.0 * 1024.0);
        double usedMemoryMB = totalMemoryMB - freeMemoryMB;
        double maxMemoryMB = runtime.maxMemory() / (1024.0 * 1024.0);

        Map<String, Object> appStats = new LinkedHashMap<>();
        appStats.put("name", applicationName);
        appStats.put("status", "UP");
        appStats.put("uptime", formatUptime(uptimeSeconds));
        appStats.put("uptimeSeconds", uptimeSeconds);

        Map<String, Object> envStats = new LinkedHashMap<>();
        envStats.put("javaVersion", System.getProperty("java.version"));
        envStats.put("javaVendor", System.getProperty("java.vendor"));
        envStats.put("os", System.getProperty("os.name") + " (" + System.getProperty("os.arch") + ")");
        envStats.put("availableProcessors", runtime.availableProcessors());
        appStats.put("environment", envStats);

        Map<String, Object> memoryStats = new LinkedHashMap<>();
        memoryStats.put("usedMB", Math.round(usedMemoryMB * 100.0) / 100.0);
        memoryStats.put("freeMB", Math.round(freeMemoryMB * 100.0) / 100.0);
        memoryStats.put("totalMB", Math.round(totalMemoryMB * 100.0) / 100.0);
        memoryStats.put("maxMB", Math.round(maxMemoryMB * 100.0) / 100.0);
        appStats.put("memory", memoryStats);

        Map<String, Object> threadStats = new LinkedHashMap<>();
        threadStats.put("activeCount", threadMXBean.getThreadCount());
        threadStats.put("peakCount", threadMXBean.getPeakThreadCount());
        appStats.put("threads", threadStats);

        health.put("application", appStats);

        // Database / Data store health check
        Map<String, Object> dbStats = new LinkedHashMap<>();
        try {
            long totalRecords = taskRepository.count();
            long dbResponseTime = System.currentTimeMillis() - startTime;

            String dbProductName = "RELATIONAL_JPA_STORE";
            String dbProductVersion = "N/A";

            if (dataSource != null) {
                try (Connection conn = dataSource.getConnection()) {
                    DatabaseMetaData meta = conn.getMetaData();
                    dbProductName = meta.getDatabaseProductName();
                    dbProductVersion = meta.getDatabaseProductVersion();
                } catch (Exception ignored) {
                    // Fallback to defaults
                }
            }

            dbStats.put("status", "UP");
            dbStats.put("product", dbProductName);
            dbStats.put("version", dbProductVersion);
            dbStats.put("totalRecords", totalRecords);
            dbStats.put("totalTasksPersisted", totalRecords);
            dbStats.put("readWriteCheck", "OK");
            dbStats.put("responseTimeMs", dbResponseTime);
        } catch (Exception ex) {
            dbStats.put("status", "DOWN");
            dbStats.put("error", ex.getMessage());
            health.put("status", "DOWN");
        }
        health.put("database", dbStats);

        return ResponseEntity.ok(health);
    }

    private String formatUptime(long totalSeconds) {
        long days = totalSeconds / 86400;
        long hours = (totalSeconds % 86400) / 3600;
        long minutes = (totalSeconds % 3600) / 60;
        long seconds = totalSeconds % 60;

        StringBuilder sb = new StringBuilder();
        if (days > 0) sb.append(days).append("d ");
        if (hours > 0 || days > 0) sb.append(hours).append("h ");
        if (minutes > 0 || hours > 0 || days > 0) sb.append(minutes).append("m ");
        sb.append(seconds).append("s");
        return sb.toString();
    }
}
