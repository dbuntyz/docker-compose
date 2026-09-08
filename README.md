# TaskFlow - Spring Boot Java 21 & MariaDB REST Application

A robust, modern Spring Boot 3 REST API & interactive web application for task management backed by **MariaDB with persistent Docker volumes** and **Java 21 LTS**.

---

## 🚀 Features

- **MariaDB Persistent Storage**: Production-grade relational persistence using Spring Data JPA and Hibernate ORM.
- **Docker Compose Setup**: Simple multi-container architecture with a MariaDB database, health checks, and named persistent volume (`mariadb_data`).
- **Test Data Submission Form**: Built-in interactive test submission panel with preset scenarios (Bug Fixes, Deployments, DB Optimization) and 1-click 5-task sample batch generation.
- **RESTful CRUD & Batch Operations**: Create, Read, Update, Delete, Status Patching, and Batch Insertion (`/api/tasks/batch`).
- **Glassmorphic Web Dashboard**: Dark-mode UI at `http://localhost:8080` with live database status introspection, real-time stats, and responsive filters.
- **Automated Test Suite**: JUnit 5 and `MockMvc` integration tests powered by an isolated in-memory H2 database for rapid CI/CD runs.

---

## 🐳 Docker Compose Quick Start

### 1. Start MariaDB & Spring Boot App
Run the following command in the project root:

```bash
docker compose up --build
```

This will:
1. Start a **MariaDB 10.11** container on port `3306` with a persistent volume named `mariadb_data`.
2. Wait for MariaDB's health check to pass.
3. Build and launch the **Spring Boot application** on port `8080`, connected to MariaDB.

### 2. Access the Application
Open your browser and navigate to:
👉 **[http://localhost:8080](http://localhost:8080)**

### 3. Stop Containers
```bash
# Stop containers (keeps persistent volume intact)
docker compose down

# Stop containers and wipe the persistent database volume
docker compose down -v
```

---

## ⚙️ Docker Compose Configuration

The [`docker-compose.yml`](file:///d:/test-project-java/docker-compose.yml) defines:

```yaml
services:
  # MariaDB Database Service with Persistent Volume
  mariadb:
    image: mariadb:10.11
    container_name: taskflow-mariadb
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: taskflow_db
      MYSQL_USER: taskuser
      MYSQL_PASSWORD: taskpassword
    ports:
      - "3306:3306"
    volumes:
      - mariadb_data:/var/lib/mysql
    healthcheck:
      test: ["CMD-SHELL", "mariadb-admin ping -h 127.0.0.1 -u root --password=rootpassword || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

  # Spring Boot Java Application Service
  app:
    build: .
    container_name: taskflow-app
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:mariadb://mariadb:3306/taskflow_db?createDatabaseIfNotExist=true&useUnicode=true&characterEncoding=UTF-8
      SPRING_DATASOURCE_USERNAME: taskuser
      SPRING_DATASOURCE_PASSWORD: taskpassword
      SPRING_DATASOURCE_DRIVER_CLASS_NAME: org.mariadb.jdbc.Driver
      SPRING_JPA_HIBERNATE_DDL_AUTO: update
      SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT: org.hibernate.dialect.MariaDBDialect
    depends_on:
      mariadb:
        condition: service_healthy

# Named Persistent Volume for MariaDB Storage
volumes:
  mariadb_data:
    driver: local
```

---

## ⚡ Local Development (Maven)

### 1. Run Automated Unit Tests
```powershell
mvn clean test
```

### 2. Start MariaDB only (via Docker)
```powershell
docker compose up mariadb -d
```

### 3. Run Spring Boot Application Locally
```powershell
mvn spring-boot:run
```

## GitHub Actions Deployment to AWS EC2

The workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs tests, builds the Docker image, pushes it to Docker Hub, and deploys it to an Ubuntu EC2 instance when changes reach `main`.

### Required GitHub repository secrets

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username and image owner |
| `DOCKERHUB_TOKEN` | Docker Hub access token with push permission |
| `EC2_HOST` | EC2 public DNS name or public IP address |
| `EC2_USERNAME` | Usually `ubuntu` |
| `EC2_SSH_KEY` | Full contents of the PEM private key |

The EC2 instance must have Docker Engine and the Docker Compose plugin installed. Allow inbound TCP port `8080` in its security group. The deployment uses `/opt/taskflow`, keeps MariaDB data in the `mariadb_data` Docker volume, and serves the application at `http://<EC2_HOST>:8080`.

The production Compose file is [`docker-compose.prod.yml`](docker-compose.prod.yml). Its database defaults match local development; set stronger values in an EC2-side `.env` file before production use if needed.

---

## 🧪 Test Data Submission & Presets

You can submit test data directly from the web UI or via curl:

### Quick Presets Available in UI:
- 🐞 **Fix Auth Bug**: Pre-fills high-priority token expiration issue.
- 🚀 **Deploy Service**: Pre-fills microservice Kubernetes deployment task.
- ⚡ **Optimize DB**: Pre-fills MariaDB query indexing task.
- 🛡️ **Security Audit**: Pre-fills dependency and vulnerability check task.
- ⚡ **Generate 5 Sample Tasks**: Submits 5 realistic records in one batch to MariaDB.

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description | Payload / Params |
|---|---|---|---|
| `GET` | `/api/tasks` | Get all tasks from MariaDB | `?search=...&status=...&priority=...` |
| `GET` | `/api/tasks/{id}` | Get single task by numeric ID | Path: `id` |
| `POST` | `/api/tasks` | Create single task in MariaDB | JSON: `{title, description, status, priority}` |
| `POST` | `/api/tasks/batch` | Batch create multiple tasks in MariaDB | JSON array: `[{...}, {...}]` |
| `PUT` | `/api/tasks/{id}` | Update existing task | Path: `id` + JSON body |
| `PATCH` | `/api/tasks/{id}/status` | Update task status | Path: `id` + `?status=COMPLETED` |
| `DELETE` | `/api/tasks/{id}` | Delete task from MariaDB | Path: `id` |
| `GET` | `/api/tasks/stats` | Aggregated counts by status | None |
| `GET` | `/api/health` | Live MariaDB status & JVM stats | None |

---

## 💻 Example API Calls

### 1. Submit Single Test Data (POST)
```bash
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Verify MariaDB Persistence",
    "description": "Test data is retained across container restarts",
    "status": "IN_PROGRESS",
    "priority": "HIGH"
  }'
```

### 2. Batch Submit Test Data (POST)
```bash
curl -X POST http://localhost:8080/api/tasks/batch \
  -H "Content-Type: application/json" \
  -d '[
    {
      "title": "Configure Read Replicas",
      "description": "Set up MariaDB replica instances",
      "status": "PENDING",
      "priority": "MEDIUM"
    },
    {
      "title": "Implement Health Endpoint Check",
      "description": "Query database metadata dynamically",
      "status": "COMPLETED",
      "priority": "HIGH"
    }
  ]'
```

### 3. Check Live Database Health (GET)
```bash
curl http://localhost:8080/api/health
```
