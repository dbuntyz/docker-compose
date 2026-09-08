package com.example.demo.service;

import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.model.Task;
import com.example.demo.model.TaskPriority;
import com.example.demo.model.TaskStatus;
import com.example.demo.repository.TaskRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class TaskService {

    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @PostConstruct
    public void initSeedData() {
        if (taskRepository.count() == 0) {
            taskRepository.save(new Task(null, "Set up Spring Boot Applications", "Configure pom.xml and basic application architecture with MariaDB JPA", TaskStatus.COMPLETED, TaskPriority.HIGH));
            taskRepository.save(new Task(null, "Implement REST Endpoints", "Build CRUD API endpoints for Task entity connected to MariaDB", TaskStatus.IN_PROGRESS, TaskPriority.HIGH));
            taskRepository.save(new Task(null, "Create Web Dashboard UI(s)", "Design interactive frontend with glassmorphic cards, test data form and live filters", TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM));
            taskRepository.save(new Task(null, "Write Comprehensive Unit Tests", "Add MockMvc tests to verify API endpoints and validation", TaskStatus.PENDING, TaskPriority.LOW));
        }
    }

    @Transactional(readOnly = true)
    public List<Task> getAllTasks(String query, TaskStatus status, TaskPriority priority) {
        return taskRepository.search(query, status, priority);
    }

    @Transactional(readOnly = true)
    public Task getTaskById(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + id));
    }

    public Task createTask(Task task) {
        task.setId(null); // Ensure fresh ID is generated
        return taskRepository.save(task);
    }

    public List<Task> createTasks(List<Task> tasks) {
        tasks.forEach(t -> t.setId(null));
        return taskRepository.saveAll(tasks);
    }

    public Task updateTask(Long id, Task updatedTask) {
        Task existing = getTaskById(id);

        existing.setTitle(updatedTask.getTitle());
        existing.setDescription(updatedTask.getDescription());
        existing.setStatus(updatedTask.getStatus());
        existing.setPriority(updatedTask.getPriority());

        return taskRepository.save(existing);
    }

    public Task updateStatus(Long id, TaskStatus status) {
        Task existing = getTaskById(id);
        existing.setStatus(status);
        return taskRepository.save(existing);
    }

    public void deleteTask(Long id) {
        if (!taskRepository.existsById(id)) {
            throw new ResourceNotFoundException("Task not found with id: " + id);
        }
        taskRepository.deleteById(id);
    }
}
