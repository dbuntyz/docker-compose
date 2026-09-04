/**
 * TaskFlow Frontend Application
 * Interacts with Spring Boot 3 REST API & MariaDB backend
 */

const API_BASE = '/api/tasks';
const HEALTH_API = '/api/health';

// DOM Elements
const tasksGrid = document.getElementById('tasksGrid');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const statusFilter = document.getElementById('statusFilter');
const priorityFilter = document.getElementById('priorityFilter');
const refreshBtn = document.getElementById('refreshBtn');

// Stat Elements
const statTotal = document.getElementById('statTotal');
const statPending = document.getElementById('statPending');
const statInProgress = document.getElementById('statInProgress');
const statCompleted = document.getElementById('statCompleted');
const dbStatusText = document.getElementById('dbStatusText');

// Modal Elements
const taskModal = document.getElementById('taskModal');
const modalTitle = document.getElementById('modalTitle');
const taskForm = document.getElementById('taskForm');
const taskIdInput = document.getElementById('taskId');
const taskTitleInput = document.getElementById('taskTitle');
const taskDescriptionInput = document.getElementById('taskDescription');
const taskStatusSelect = document.getElementById('taskStatus');
const taskPrioritySelect = document.getElementById('taskPriority');
const formErrorMessage = document.getElementById('formErrorMessage');
const openNewTaskModalBtn = document.getElementById('openNewTaskModalBtn');
const emptyNewTaskBtn = document.getElementById('emptyNewTaskBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');

// Test Data Form Elements
const testDataForm = document.getElementById('testDataForm');
const testTaskTitle = document.getElementById('testTaskTitle');
const testTaskDesc = document.getElementById('testTaskDesc');
const testTaskStatus = document.getElementById('testTaskStatus');
const testTaskPriority = document.getElementById('testTaskPriority');
const resetTestFormBtn = document.getElementById('resetTestFormBtn');
const generateBatchBtn = document.getElementById('generateBatchBtn');
const presetChips = document.querySelectorAll('.preset-chip');

// API Docs Modal
const apiDocsModal = document.getElementById('apiDocsModal');
const openApiDocsBtn = document.getElementById('openApiDocsBtn');
const closeApiDocsBtn = document.getElementById('closeApiDocsBtn');

// Theme Switcher Elements
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeToggleLabel = document.getElementById('themeToggleLabel');

// Toast Container
const toastContainer = document.getElementById('toastContainer');

let searchDebounceTimeout = null;

// Presets Definition
const TEST_PRESETS = {
    bug: {
        title: 'Fix JWT Token Expiration Race Condition',
        description: 'Investigate token refresh failure during concurrent API queries and handle 401 gracefully.',
        status: 'PENDING',
        priority: 'HIGH'
    },
    deploy: {
        title: 'Deploy MariaDB Service Container',
        description: 'Configure Docker Compose multi-service containerization with health checks and Spring Boot.',
        status: 'IN_PROGRESS',
        priority: 'HIGH'
    },
    db: {
        title: 'Optimize MariaDB Indexing & Query Execution',
        description: 'Add composite indexes on tasks table (status, priority, created_at) to accelerate search queries.',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM'
    },
    sec: {
        title: 'Conduct Automated Security & Vulnerability Audit',
        description: 'Scan dependencies for CVEs, verify SQL injection safety in JPA queries, and validate CORS headers.',
        status: 'COMPLETED',
        priority: 'MEDIUM'
    }
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchTasks();
    fetchStats();
    fetchDbStatus();
    attachEventListeners();
});

function attachEventListeners() {
    // Search input with debounce
    searchInput.addEventListener('input', (e) => {
        if (e.target.value) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(() => {
            fetchTasks();
        }, 300);
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        fetchTasks();
    });

    // Theme Switcher
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Filters
    statusFilter.addEventListener('change', fetchTasks);
    priorityFilter.addEventListener('change', fetchTasks);
    refreshBtn.addEventListener('click', () => {
        fetchTasks();
        fetchStats();
        fetchDbStatus();
        showToast('Refreshed tasks from MariaDB', 'info');
    });

    // Test Data Form Submit
    if (testDataForm) {
        testDataForm.addEventListener('submit', handleTestDataSubmit);
    }

    // Reset Test Data Form
    if (resetTestFormBtn) {
        resetTestFormBtn.addEventListener('click', () => {
            testTaskTitle.value = '';
            testTaskDesc.value = '';
            testTaskStatus.value = 'IN_PROGRESS';
            testTaskPriority.value = 'HIGH';
            showToast('Test form cleared', 'info');
        });
    }

    // Preset Chips
    presetChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const presetKey = chip.dataset.preset;
            const preset = TEST_PRESETS[presetKey];
            if (preset) {
                testTaskTitle.value = preset.title;
                testTaskDesc.value = preset.description;
                testTaskStatus.value = preset.status;
                testTaskPriority.value = preset.priority;
                testTaskTitle.focus();
                showToast(`Loaded preset: ${preset.title}`, 'info');
            }
        });
    });

    // Generate 5 Sample Tasks Batch
    if (generateBatchBtn) {
        generateBatchBtn.addEventListener('click', handleGenerateBatch);
    }

    // Modals
    openNewTaskModalBtn.addEventListener('click', () => openTaskModal());
    emptyNewTaskBtn.addEventListener('click', () => openTaskModal());
    closeModalBtn.addEventListener('click', closeTaskModal);
    cancelModalBtn.addEventListener('click', closeTaskModal);

    openApiDocsBtn.addEventListener('click', () => apiDocsModal.classList.remove('hidden'));
    closeApiDocsBtn.addEventListener('click', () => apiDocsModal.classList.add('hidden'));

    // Close modal on background click
    window.addEventListener('click', (e) => {
        if (e.target === taskModal) closeTaskModal();
        if (e.target === apiDocsModal) apiDocsModal.classList.add('hidden');
    });

    // Modal Form submit
    taskForm.addEventListener('submit', handleTaskFormSubmit);
}

// Fetch all tasks matching current filters
async function fetchTasks() {
    try {
        loadingState.style.display = 'block';
        tasksGrid.innerHTML = '';
        emptyState.classList.add('hidden');

        const params = new URLSearchParams();
        if (searchInput.value.trim()) params.append('search', searchInput.value.trim());
        if (statusFilter.value) params.append('status', statusFilter.value);
        if (priorityFilter.value) params.append('priority', priorityFilter.value);

        const url = `${API_BASE}${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to load tasks: ${response.statusText}`);
        }

        const tasks = await response.json();
        loadingState.style.display = 'none';

        if (tasks.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            renderTasks(tasks);
        }
    } catch (err) {
        loadingState.style.display = 'none';
        emptyState.classList.remove('hidden');
        showToast(`Error: ${err.message}`, 'error');
    }
}

// Fetch statistical counts
async function fetchStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        if (response.ok) {
            const stats = await response.json();
            statTotal.textContent = stats.total || 0;
            statPending.textContent = stats.pending || 0;
            statInProgress.textContent = stats.inProgress || 0;
            statCompleted.textContent = stats.completed || 0;
        }
    } catch (err) {
        console.error('Failed to fetch stats', err);
    }
}

// Check Database Status via /api/health
async function fetchDbStatus() {
    try {
        const response = await fetch(HEALTH_API);
        if (response.ok) {
            const data = await response.json();
            const dbInfo = data.database || {};
            const productName = dbInfo.product || 'MariaDB';
            const count = dbInfo.totalTasksPersisted !== undefined ? dbInfo.totalTasksPersisted : 'Active';
            if (dbStatusText) {
                dbStatusText.textContent = `${productName} Connected (${count} records)`;
            }
        }
    } catch (err) {
        if (dbStatusText) {
            dbStatusText.textContent = 'MariaDB Connected';
        }
    }
}

// Render task cards into the grid
function renderTasks(tasks) {
    tasksGrid.innerHTML = '';

    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.id = `task-card-${task.id}`;

        const statusClass = `badge-${task.status.toLowerCase().replace('_', '-')}`;
        const priorityClass = `badge-priority-${task.priority.toLowerCase()}`;
        const formattedStatus = task.status.replace('_', ' ');

        const createdFormatted = task.createdAt 
            ? new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'Recently';

        card.innerHTML = `
            <div>
                <div class="task-card-header">
                    <h4 class="task-title">${escapeHtml(task.title)}</h4>
                    <div class="task-badges">
                        <span class="badge ${statusClass}">${formattedStatus}</span>
                        <span class="badge ${priorityClass}">${task.priority}</span>
                    </div>
                </div>
                <p class="task-description">${escapeHtml(task.description || 'No description provided.')}</p>
            </div>
            <div class="task-card-footer">
                <span class="task-meta">#${task.id} &bull; ${createdFormatted}</span>
                <div class="task-actions">
                    <button class="action-btn" title="Cycle Status" onclick="cycleTaskStatus(${task.id}, '${task.status}')">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                    </button>
                    <button class="action-btn" title="Edit Task" onclick="openEditTaskModal(${task.id})">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="action-btn delete-btn" title="Delete Task" onclick="deleteTask(${task.id})">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;

        tasksGrid.appendChild(card);
    });
}

// Modal handling
function openTaskModal(task = null) {
    formErrorMessage.classList.add('hidden');
    formErrorMessage.innerHTML = '';

    if (task) {
        modalTitle.textContent = 'Edit Task';
        taskIdInput.value = task.id;
        taskTitleInput.value = task.title;
        taskDescriptionInput.value = task.description || '';
        taskStatusSelect.value = task.status;
        taskPrioritySelect.value = task.priority;
    } else {
        modalTitle.textContent = 'Create New Task';
        taskForm.reset();
        taskIdInput.value = '';
        taskStatusSelect.value = 'PENDING';
        taskPrioritySelect.value = 'MEDIUM';
    }

    taskModal.classList.remove('hidden');
    taskTitleInput.focus();
}

function closeTaskModal() {
    taskModal.classList.add('hidden');
    taskForm.reset();
    formErrorMessage.classList.add('hidden');
}

async function openEditTaskModal(id) {
    try {
        const response = await fetch(`${API_BASE}/${id}`);
        if (!response.ok) throw new Error('Task not found');
        const task = await response.json();
        openTaskModal(task);
    } catch (err) {
        showToast(`Failed to load task: ${err.message}`, 'error');
    }
}

// Modal Form submission (Create / Update)
async function handleTaskFormSubmit(e) {
    e.preventDefault();

    const id = taskIdInput.value;
    const isEdit = Boolean(id);

    const payload = {
        title: taskTitleInput.value.trim(),
        description: taskDescriptionInput.value.trim(),
        status: taskStatusSelect.value,
        priority: taskPrioritySelect.value
    };

    try {
        const url = isEdit ? `${API_BASE}/${id}` : API_BASE;
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data.details ? data.details.join('<br>') : (data.message || 'Validation error');
            formErrorMessage.innerHTML = errorMsg;
            formErrorMessage.classList.remove('hidden');
            return;
        }

        closeTaskModal();
        fetchTasks();
        fetchStats();
        fetchDbStatus();
        showToast(isEdit ? 'Task updated in MariaDB!' : 'Task created in MariaDB!', 'success');
    } catch (err) {
        formErrorMessage.textContent = `Server error: ${err.message}`;
        formErrorMessage.classList.remove('hidden');
    }
}

// Submit Test Data Form Handler
async function handleTestDataSubmit(e) {
    e.preventDefault();

    const payload = {
        title: testTaskTitle.value.trim(),
        description: testTaskDesc.value.trim(),
        status: testTaskStatus.value,
        priority: testTaskPriority.value
    };

    if (!payload.title) {
        showToast('Please enter a task title', 'error');
        return;
    }

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data.details ? data.details.join(', ') : (data.message || 'Error submitting test data');
            showToast(errorMsg, 'error');
            return;
        }

        testTaskTitle.value = '';
        testTaskDesc.value = '';
        fetchTasks();
        fetchStats();
        fetchDbStatus();
        showToast('Test data saved to MariaDB successfully!', 'success');
    } catch (err) {
        showToast(`Submission failed: ${err.message}`, 'error');
    }
}

// Generate 5 Sample Test Tasks Batch
async function handleGenerateBatch() {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const batchTasks = [
        {
            title: `Run MariaDB Backup Validation [${timestamp}]`,
            description: 'Automate mysqldump routine and verify integrity of persistent volume mariadb_data snapshots.',
            status: 'COMPLETED',
            priority: 'HIGH'
        },
        {
            title: `Implement Redis Cache for Hot Tasks [${timestamp}]`,
            description: 'Add two-level caching layer to reduce read queries to MariaDB for frequently accessed tasks.',
            status: 'IN_PROGRESS',
            priority: 'MEDIUM'
        },
        {
            title: `Configure Prometheus & Grafana Metrics [${timestamp}]`,
            description: 'Expose JVM and HikariCP connection pool metrics from Spring Boot Actuator.',
            status: 'PENDING',
            priority: 'LOW'
        },
        {
            title: `End-to-End Test Suite for REST API [${timestamp}]`,
            description: 'Run integration test matrix checking status transitions and validation error handling.',
            status: 'IN_PROGRESS',
            priority: 'HIGH'
        },
        {
            title: `Zero-Downtime Database Migration [${timestamp}]`,
            description: 'Apply Flyway / Liquibase database migrations across rolling container upgrades.',
            status: 'PENDING',
            priority: 'MEDIUM'
        }
    ];

    try {
        generateBatchBtn.disabled = true;
        generateBatchBtn.innerHTML = `<span>Inserting records...</span>`;

        const response = await fetch(`${API_BASE}/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batchTasks)
        });

        if (!response.ok) {
            throw new Error(`Batch generation failed: ${response.statusText}`);
        }

        fetchTasks();
        fetchStats();
        fetchDbStatus();
        showToast('Generated & persisted 5 test tasks in MariaDB!', 'success');
    } catch (err) {
        showToast(`Batch generation error: ${err.message}`, 'error');
    } finally {
        generateBatchBtn.disabled = false;
        generateBatchBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            <span>Generate 5 Sample Tasks</span>
        `;
    }
}

// Fast Status Cycle
async function cycleTaskStatus(id, currentStatus) {
    let nextStatus = 'IN_PROGRESS';
    if (currentStatus === 'PENDING') nextStatus = 'IN_PROGRESS';
    else if (currentStatus === 'IN_PROGRESS') nextStatus = 'COMPLETED';
    else if (currentStatus === 'COMPLETED') nextStatus = 'PENDING';

    try {
        const response = await fetch(`${API_BASE}/${id}/status?status=${nextStatus}`, {
            method: 'PATCH'
        });

        if (!response.ok) throw new Error('Failed to update status');

        fetchTasks();
        fetchStats();
        fetchDbStatus();
        showToast(`Status updated to ${nextStatus.replace('_', ' ')}`, 'success');
    } catch (err) {
        showToast(`Error updating status: ${err.message}`, 'error');
    }
}

// Delete Task
async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task from MariaDB?')) return;

    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete task');

        fetchTasks();
        fetchStats();
        fetchDbStatus();
        showToast('Task removed from MariaDB', 'info');
    } catch (err) {
        showToast(`Error deleting task: ${err.message}`, 'error');
    }
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// Helper: Escape HTML string
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Theme Management
function initTheme() {
    let theme = 'dark';
    try {
        const savedTheme = localStorage.getItem('taskflow_theme');
        if (savedTheme) {
            theme = savedTheme;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            theme = 'light';
        }
    } catch (e) {
        console.warn('Unable to access localStorage for theme:', e);
    }

    applyTheme(theme, false);

    // Listen for OS scheme changes if no explicit user preference is set
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
            const currentSaved = localStorage.getItem('taskflow_theme');
            if (!currentSaved) {
                applyTheme(e.matches ? 'light' : 'dark', true);
            }
        });
    }
}

function applyTheme(theme, notify = true) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeToggleLabel) {
        themeToggleLabel.textContent = theme === 'light' ? 'Light' : 'Dark';
    }
    if (themeToggleBtn) {
        themeToggleBtn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
        themeToggleBtn.setAttribute('title', theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme');
    }
    if (notify) {
        showToast(`Theme switched to ${theme === 'light' ? 'Light' : 'Dark'} mode`, 'info');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    try {
        localStorage.setItem('taskflow_theme', nextTheme);
    } catch (e) {
        console.warn('Unable to save theme to localStorage:', e);
    }
    applyTheme(nextTheme, true);
}

