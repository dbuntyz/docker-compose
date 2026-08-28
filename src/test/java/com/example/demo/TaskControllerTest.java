package com.example.demo;

import com.example.demo.model.Task;
import com.example.demo.model.TaskPriority;
import com.example.demo.model.TaskStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("GET /api/tasks returns 200 and list of tasks")
    void testGetAllTasks() throws Exception {
        mockMvc.perform(get("/api/tasks"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", not(empty())));
    }

    @Test
    @DisplayName("GET /api/tasks/1 returns 200 and task details")
    void testGetTaskById() throws Exception {
        mockMvc.perform(get("/api/tasks/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.title", notNullValue()));
    }

    @Test
    @DisplayName("GET /api/tasks/99999 returns 404 Not Found")
    void testGetTaskByIdNotFound() throws Exception {
        mockMvc.perform(get("/api/tasks/99999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")));
    }

    @Test
    @DisplayName("POST /api/tasks with valid data returns 201 Created")
    void testCreateTaskSuccess() throws Exception {
        Task newTask = new Task(null, "Automated Test Task", "Created during test execution", TaskStatus.PENDING, TaskPriority.HIGH);

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newTask)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.title", is("Automated Test Task")))
                .andExpect(jsonPath("$.status", is("PENDING")))
                .andExpect(jsonPath("$.priority", is("HIGH")));
    }

    @Test
    @DisplayName("POST /api/tasks with blank title returns 400 Bad Request")
    void testCreateTaskValidationFailure() throws Exception {
        Task invalidTask = new Task(null, "", "Invalid description", TaskStatus.PENDING, TaskPriority.LOW);

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidTask)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.details", not(empty())));
    }

    @Test
    @DisplayName("POST /api/tasks/batch creates multiple test tasks")
    void testCreateTasksBatch() throws Exception {
        java.util.List<Task> batch = java.util.List.of(
                new Task(null, "Batch Task Alpha", "First batch task", TaskStatus.PENDING, TaskPriority.HIGH),
                new Task(null, "Batch Task Beta", "Second batch task", TaskStatus.IN_PROGRESS, TaskPriority.LOW)
        );

        mockMvc.perform(post("/api/tasks/batch")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(batch)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].title", is("Batch Task Alpha")))
                .andExpect(jsonPath("$[1].title", is("Batch Task Beta")));
    }

    @Test
    @DisplayName("PUT /api/tasks/2 updates task successfully")
    void testUpdateTask() throws Exception {
        Task updatedTask = new Task(null, "Updated Title Test", "Updated description", TaskStatus.COMPLETED, TaskPriority.LOW);

        mockMvc.perform(put("/api/tasks/2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedTask)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(2)))
                .andExpect(jsonPath("$.title", is("Updated Title Test")))
                .andExpect(jsonPath("$.status", is("COMPLETED")));
    }

    @Test
    @DisplayName("PATCH /api/tasks/1/status updates status")
    void testPatchStatus() throws Exception {
        mockMvc.perform(patch("/api/tasks/1/status").param("status", "COMPLETED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.status", is("COMPLETED")));
    }

    @Test
    @DisplayName("GET /api/tasks/stats returns summary statistics")
    void testGetStats() throws Exception {
        mockMvc.perform(get("/api/tasks/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", notNullValue()))
                .andExpect(jsonPath("$.pending", notNullValue()))
                .andExpect(jsonPath("$.inProgress", notNullValue()))
                .andExpect(jsonPath("$.completed", notNullValue()));
    }

    @Test
    @DisplayName("DELETE /api/tasks/3 removes task")
    void testDeleteTask() throws Exception {
        mockMvc.perform(delete("/api/tasks/3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        // Subsequent get should return 404
        mockMvc.perform(get("/api/tasks/3"))
                .andExpect(status().isNotFound());
    }
}
