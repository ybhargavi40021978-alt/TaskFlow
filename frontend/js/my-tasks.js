/**
 * TaskFlow — Modern Collaborative Project Management Web Application
 * Interface 5: My Tasks Page Logic
 * File: my-tasks.js
 */

document.addEventListener('DOMContentLoaded', () => {
  TaskManager.init();
});

/**
 * TaskManager Module
 * Handles local state, filtering, list & board rendering, modals, and shell controls.
 */
const TaskManager = (() => {
  // State
  let tasks = [];
  let currentView = 'list'; // 'list' | 'board'
  let currentTab = 'all'; // 'all' | 'today' | 'upcoming' | 'completed'
  let cardStatusFilter = 'all'; // 'all' | 'In Progress' | 'Completed' | 'overdue'
  let activeDeletingTaskId = null;
  let activeDetailTaskId = null;

  // DOM Elements Cache
  const elements = {
    // Counts
    countAllTasks: document.getElementById('countAllTasks'),
    countInProgress: document.getElementById('countInProgress'),
    countCompleted: document.getElementById('countCompleted'),
    countOverdue: document.getElementById('countOverdue'),
    sidebarTaskBadge: document.getElementById('sidebarTaskBadge'),

    // Summary cards
    summaryCards: document.querySelectorAll('.summary-card'),

    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),

    // Toolbar filters
    taskSearchFilterInput: document.getElementById('taskSearchFilterInput'),
    projectFilterSelect: document.getElementById('projectFilterSelect'),
    priorityFilterSelect: document.getElementById('priorityFilterSelect'),
    statusFilterSelect: document.getElementById('statusFilterSelect'),
    sortControlSelect: document.getElementById('sortControlSelect'),

    // View toggles
    listViewToggleBtn: document.getElementById('listViewToggleBtn'),
    boardViewToggleBtn: document.getElementById('boardViewToggleBtn'),
    taskTableWrapper: document.getElementById('taskTableWrapper'),
    taskBoardWrapper: document.getElementById('taskBoardWrapper'),
    emptyStateContainer: document.getElementById('emptyStateContainer'),

    // Table
    taskTableBody: document.getElementById('taskTableBody'),
    selectAllCheckbox: document.getElementById('selectAllTasksCheckbox'),

    // Board columns
    cardsContainerTodo: document.getElementById('cardsContainerTodo'),
    cardsContainerInProgress: document.getElementById('cardsContainerInProgress'),
    cardsContainerCompleted: document.getElementById('cardsContainerCompleted'),
    boardCountTodo: document.getElementById('boardCountTodo'),
    boardCountInProgress: document.getElementById('boardCountInProgress'),
    boardCountCompleted: document.getElementById('boardCountCompleted'),

    // Header date / today
    todayFilterBtn: document.getElementById('todayFilterBtn'),
    datePickerInput: document.getElementById('datePickerInput'),

    // Modals
    taskModal: document.getElementById('taskModal'),
    taskForm: document.getElementById('taskForm'),
    taskFormId: document.getElementById('taskFormId'),
    modalTaskHeading: document.getElementById('modalTaskHeading'),
    modalTaskSubheading: document.getElementById('modalTaskSubheading'),
    taskTitleInput: document.getElementById('taskTitleInput'),
    taskDescInput: document.getElementById('taskDescInput'),
    taskProjectSelect: document.getElementById('taskProjectSelect'),
    taskPrioritySelect: document.getElementById('taskPrioritySelect'),
    taskStatusSelect: document.getElementById('taskStatusSelect'),
    taskDueDateInput: document.getElementById('taskDueDateInput'),
    taskAssigneeSelect: document.getElementById('taskAssigneeSelect'),
    closeTaskModalBtn: document.getElementById('closeTaskModalBtn'),
    cancelTaskModalBtn: document.getElementById('cancelTaskModalBtn'),
    saveTaskModalBtn: document.getElementById('saveTaskModalBtn'),

    // Detail Modal
    taskDetailsModal: document.getElementById('taskDetailsModal'),
    detailProjectTag: document.getElementById('detailProjectTag'),
    detailPriorityTag: document.getElementById('detailPriorityTag'),
    detailStatusTag: document.getElementById('detailStatusTag'),
    detailTaskTitle: document.getElementById('detailTaskTitle'),
    detailTaskDescription: document.getElementById('detailTaskDescription'),
    detailDueDateVal: document.getElementById('detailDueDateVal'),
    detailAssigneeVal: document.getElementById('detailAssigneeVal'),
    detailTaskIdVal: document.getElementById('detailTaskIdVal'),
    closeDetailModalBtn: document.getElementById('closeDetailModalBtn'),
    deleteTaskFromDetailBtn: document.getElementById('deleteTaskFromDetailBtn'),
    editTaskFromDetailBtn: document.getElementById('editTaskFromDetailBtn'),
    toggleTaskCompleteFromDetailBtn: document.getElementById('toggleTaskCompleteFromDetailBtn'),

    // Delete Modal
    deleteConfirmModal: document.getElementById('deleteConfirmModal'),
    deleteTaskNameTarget: document.getElementById('deleteTaskNameTarget'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

    // Action Triggers
    addTaskHeaderBtn: document.getElementById('addTaskHeaderBtn'),
    emptyCreateTaskBtn: document.getElementById('emptyCreateTaskBtn'),
    actionCreateTask: document.getElementById('actionCreateTask')
  };

  /**
   * Initialize module
   */
  async function init() {
    if (!TaskFlowAPI.requireAuth()) return;

    initShellNavigation();
    initSummaryCards();
    initTabs();
    initFiltersAndSorting();
    initViewToggles();
    initModals();
    initHeaderSearch();
    initKeyboardShortcuts();

    if (elements.datePickerInput) {
      elements.datePickerInput.value = new Date().toISOString().split('T')[0];
    }

    await fetchTasksFromAPI();

    if (window.TaskFlowWS) {
      TaskFlowWS.onTaskUpdate(() => {
        fetchTasksFromAPI();
      });
      TaskFlowWS.onNotification(() => {
        fetchTasksFromAPI();
      });
      TaskFlowWS.onReconnect(() => {
        fetchTasksFromAPI();
      });
    }
  }

  async function fetchTasksFromAPI() {
    try {
      const [serverTasks, serverProjects] = await Promise.all([
        TaskFlowAPI.getTasks({ my_tasks: true }),
        TaskFlowAPI.getProjects()
      ]);

      if (serverProjects && elements.taskProjectSelect) {
        elements.taskProjectSelect.innerHTML = '';
        serverProjects.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name;
          elements.taskProjectSelect.appendChild(opt);
        });
      }

      if (serverTasks && Array.isArray(serverTasks)) {
        const today = new Date().toISOString().split('T')[0];
        tasks = serverTasks.map(t => {
          let dueStr = t.due_date || 'No deadline';
          let isOverdue = false;
          if (t.due_date) {
            isOverdue = t.due_date < today && t.status !== 'Completed';
            if (t.due_date === today) dueStr = 'Today';
          }
          return {
            id: t.id,
            code: `TASK-${t.id}`,
            title: t.title,
            description: t.description || '',
            project: t.project_name || 'Project',
            projectId: t.project,
            priority: t.priority || 'Medium',
            dueDate: dueStr,
            dueDateRaw: t.due_date || '',
            isOverdue,
            status: t.status || 'To Do',
            assignee: t.assignee_details ? t.assignee_details.initials : 'YB',
            assigneeName: t.assignee_details ? t.assignee_details.full_name : 'You',
            createdAt: t.created_at
          };
        });
      }
    } catch (err) {
      console.warn('Could not fetch tasks from API:', err);
    }
    render();
  }

  /**
   * Helper: Format number with leading zero
   */
  function formatCount(num) {
    return num < 10 ? `0${num}` : `${num}`;
  }

  /**
   * Update Summary Metrics and sidebar badge
   */
  function updateSummaryCounts() {
    const totalCount = tasks.length;
    const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
    const completedCount = tasks.filter(t => t.status === 'Completed').length;
    const overdueCount = tasks.filter(t => t.isOverdue || t.dueDate === 'Yesterday').length;

    if (elements.countAllTasks) elements.countAllTasks.textContent = formatCount(totalCount);
    if (elements.countInProgress) elements.countInProgress.textContent = formatCount(inProgressCount);
    if (elements.countCompleted) elements.countCompleted.textContent = formatCount(completedCount);
    if (elements.countOverdue) elements.countOverdue.textContent = formatCount(overdueCount);

    if (elements.sidebarTaskBadge) {
      elements.sidebarTaskBadge.textContent = totalCount;
    }
  }

  /**
   * Filter and Sort tasks based on active controls
   */
  function getFilteredTasks() {
    const searchQuery = (elements.taskSearchFilterInput?.value || '').trim().toLowerCase();
    const selectedProject = elements.projectFilterSelect?.value || 'all';
    const selectedPriority = elements.priorityFilterSelect?.value || 'all';
    const selectedStatus = elements.statusFilterSelect?.value || 'all';
    const sortOrder = elements.sortControlSelect?.value || 'due';

    return tasks.filter(task => {
      // 1. Search filter (title, description, project)
      if (searchQuery) {
        const matchesTitle = task.title.toLowerCase().includes(searchQuery);
        const matchesDesc = (task.description || '').toLowerCase().includes(searchQuery);
        const matchesProject = task.project.toLowerCase().includes(searchQuery);
        if (!matchesTitle && !matchesDesc && !matchesProject) return false;
      }

      // 2. Project filter
      if (selectedProject !== 'all' && task.project !== selectedProject) {
        return false;
      }

      // 3. Priority filter
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
        return false;
      }

      // 4. Status filter from dropdown
      if (selectedStatus !== 'all' && task.status !== selectedStatus) {
        return false;
      }

      // 5. Card filter (All, In Progress, Completed, Overdue)
      if (cardStatusFilter === 'In Progress' && task.status !== 'In Progress') {
        return false;
      }
      if (cardStatusFilter === 'Completed' && task.status !== 'Completed') {
        return false;
      }
      if (cardStatusFilter === 'overdue' && !(task.isOverdue || task.dueDate === 'Yesterday')) {
        return false;
      }

      // 6. Tab filter (All, Today, Upcoming, Completed)
      if (currentTab === 'today' && task.dueDate !== 'Today') {
        return false;
      }
      if (currentTab === 'completed' && task.status !== 'Completed') {
        return false;
      }
      if (currentTab === 'upcoming') {
        if (task.dueDate === 'Today' || task.dueDate === 'Yesterday' || task.status === 'Completed') {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'name') {
        return a.title.localeCompare(b.title);
      }
      if (sortOrder === 'priority') {
        const priorityWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      }
      if (sortOrder === 'recent') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      // 'due' sorting: Overdue first, then Today, Tomorrow, future dates
      const dueWeight = (dueDate) => {
        if (dueDate === 'Yesterday') return 1;
        if (dueDate === 'Today') return 2;
        if (dueDate === 'Tomorrow') return 3;
        return 4;
      };
      const diff = dueWeight(a.dueDate) - dueWeight(b.dueDate);
      if (diff !== 0) return diff;
      return (a.dueDateRaw || '').localeCompare(b.dueDateRaw || '');
    });
  }

  /**
   * Render Main Workspace (Table or Board)
   */
  function render() {
    updateSummaryCounts();
    const visibleTasks = getFilteredTasks();

    if (visibleTasks.length === 0) {
      if (elements.taskTableWrapper) elements.taskTableWrapper.style.display = 'none';
      if (elements.taskBoardWrapper) elements.taskBoardWrapper.style.display = 'none';
      if (elements.emptyStateContainer) elements.emptyStateContainer.style.display = 'flex';
      return;
    }

    if (elements.emptyStateContainer) {
      elements.emptyStateContainer.style.display = 'none';
    }

    if (currentView === 'list') {
      if (elements.taskTableWrapper) elements.taskTableWrapper.style.display = 'block';
      if (elements.taskBoardWrapper) elements.taskBoardWrapper.style.display = 'none';
      renderTable(visibleTasks);
    } else {
      if (elements.taskTableWrapper) elements.taskTableWrapper.style.display = 'none';
      if (elements.taskBoardWrapper) elements.taskBoardWrapper.style.display = 'block';
      renderBoard(visibleTasks);
    }
  }

  /**
   * Render Table View
   */
  function renderTable(visibleTasks) {
    if (!elements.taskTableBody) return;
    elements.taskTableBody.innerHTML = '';

    visibleTasks.forEach(task => {
      const isCompleted = task.status === 'Completed';
      const tr = document.createElement('tr');
      tr.className = `task-row ${isCompleted ? 'task-completed' : ''}`;
      tr.dataset.taskId = task.id;

      // Project dot color
      let dotColorClass = 'dot-blue';
      if (task.project === 'Mobile App') dotColorClass = 'dot-purple';
      if (task.project === 'Marketing Campaign') dotColorClass = 'dot-amber';

      // Priority pill
      let priorityClass = 'pri-medium';
      if (task.priority === 'High') priorityClass = 'pri-high';
      if (task.priority === 'Low') priorityClass = 'pri-low';

      // Status pill
      let statusClass = 'status-inprogress';
      if (task.status === 'To Do') statusClass = 'status-todo';
      if (task.status === 'Completed') statusClass = 'status-completed';

      // Due date class
      let dueClass = '';
      if (task.dueDate === 'Today') dueClass = 'due-today';
      if (task.dueDate === 'Yesterday' || task.isOverdue) dueClass = 'due-overdue';

      tr.innerHTML = `
        <td class="td-check">
          <input 
            type="checkbox" 
            class="task-checkbox row-task-checkbox" 
            aria-label="Mark ${escapeHtml(task.title)} complete" 
            ${isCompleted ? 'checked' : ''}
          >
        </td>
        <td class="td-name">
          <span class="task-title-cell" title="Click to view details">${escapeHtml(task.title)}</span>
        </td>
        <td class="td-project">
          <span class="project-tag">
            <span class="tag-dot ${dotColorClass}"></span>
            <span>${escapeHtml(task.project)}</span>
          </span>
        </td>
        <td class="td-priority">
          <span class="priority-pill ${priorityClass}">${escapeHtml(task.priority)}</span>
        </td>
        <td class="td-due">
          <span class="due-date-val ${dueClass}">${escapeHtml(task.dueDate)}</span>
        </td>
        <td class="td-status">
          <span class="status-pill ${statusClass}">${escapeHtml(task.status)}</span>
        </td>
        <td class="td-assignee">
          <div class="assignee-avatar" title="${escapeHtml(task.assigneeName || task.assignee)}">
            ${escapeHtml(task.assignee)}
          </div>
        </td>
        <td class="td-actions">
          <div class="row-actions-wrap">
            <button class="action-dots-btn" aria-label="More task actions" aria-haspopup="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>
            <div class="row-actions-menu" role="menu">
              <button class="row-menu-item action-view-details" role="menuitem">View Details</button>
              <button class="row-menu-item action-edit-task" role="menuitem">Edit Task</button>
              <button class="row-menu-item action-toggle-complete" role="menuitem">${isCompleted ? 'Mark Incomplete' : 'Mark Complete'}</button>
              <button class="row-menu-item danger-item action-delete-task" role="menuitem">Delete Task</button>
            </div>
          </div>
        </td>
      `;

      // Event: Checkbox toggle
      const checkbox = tr.querySelector('.row-task-checkbox');
      checkbox.addEventListener('change', () => {
        toggleTaskStatus(task.id);
      });

      // Event: Click title to open details
      const titleCell = tr.querySelector('.task-title-cell');
      titleCell.addEventListener('click', () => {
        openTaskDetailsModal(task.id);
      });

      // Event: 3-dot dropdown toggle
      const actionDotsBtn = tr.querySelector('.action-dots-btn');
      const actionMenu = tr.querySelector('.row-actions-menu');
      actionDotsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllRowMenus();
        actionMenu.classList.toggle('active');
      });

      // Menu Actions
      tr.querySelector('.action-view-details').addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllRowMenus();
        openTaskDetailsModal(task.id);
      });

      tr.querySelector('.action-edit-task').addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllRowMenus();
        openEditTaskModal(task.id);
      });

      tr.querySelector('.action-toggle-complete').addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllRowMenus();
        toggleTaskStatus(task.id);
      });

      tr.querySelector('.action-delete-task').addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllRowMenus();
        openDeleteModal(task.id);
      });

      elements.taskTableBody.appendChild(tr);
    });

    // Update select-all checkbox state
    if (elements.selectAllCheckbox) {
      const allChecked = visibleTasks.length > 0 && visibleTasks.every(t => t.status === 'Completed');
      elements.selectAllCheckbox.checked = allChecked;
    }
  }

  /**
   * Render Board View (Kanban 3-Columns)
   */
  function renderBoard(visibleTasks) {
    if (!elements.cardsContainerTodo || !elements.cardsContainerInProgress || !elements.cardsContainerCompleted) return;

    elements.cardsContainerTodo.innerHTML = '';
    elements.cardsContainerInProgress.innerHTML = '';
    elements.cardsContainerCompleted.innerHTML = '';

    const todoTasks = visibleTasks.filter(t => t.status === 'To Do');
    const inProgressTasks = visibleTasks.filter(t => t.status === 'In Progress');
    const completedTasks = visibleTasks.filter(t => t.status === 'Completed');

    if (elements.boardCountTodo) elements.boardCountTodo.textContent = todoTasks.length;
    if (elements.boardCountInProgress) elements.boardCountInProgress.textContent = inProgressTasks.length;
    if (elements.boardCountCompleted) elements.boardCountCompleted.textContent = completedTasks.length;

    todoTasks.forEach(task => renderKanbanCard(task, elements.cardsContainerTodo));
    inProgressTasks.forEach(task => renderKanbanCard(task, elements.cardsContainerInProgress));
    completedTasks.forEach(task => renderKanbanCard(task, elements.cardsContainerCompleted));

    setupBoardDragAndDrop();
  }

  /**
   * Render Single Kanban Card
   */
  function renderKanbanCard(task, container) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.dataset.taskId = task.id;

    let dotColorClass = 'dot-blue';
    if (task.project === 'Mobile App') dotColorClass = 'dot-purple';
    if (task.project === 'Marketing Campaign') dotColorClass = 'dot-amber';

    let priorityClass = 'pri-medium';
    if (task.priority === 'High') priorityClass = 'pri-high';
    if (task.priority === 'Low') priorityClass = 'pri-low';

    let dueClass = '';
    if (task.dueDate === 'Today') dueClass = 'due-today';
    if (task.dueDate === 'Yesterday' || task.isOverdue) dueClass = 'due-overdue';

    card.innerHTML = `
      <div class="kanban-card-title">${escapeHtml(task.title)}</div>
      <div class="project-tag" style="margin-bottom: 6px;">
        <span class="tag-dot ${dotColorClass}"></span>
        <span>${escapeHtml(task.project)}</span>
      </div>
      <div class="kanban-card-footer">
        <div class="kanban-meta-left">
          <span class="priority-pill ${priorityClass}">${escapeHtml(task.priority)}</span>
          <span class="due-date-val ${dueClass}" style="font-size: 0.72rem;">${escapeHtml(task.dueDate)}</span>
        </div>
        <div class="assignee-avatar" title="${escapeHtml(task.assigneeName || task.assignee)}">
          ${escapeHtml(task.assignee)}
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      openTaskDetailsModal(task.id);
    });

    container.appendChild(card);
  }

  /**
   * Setup HTML5 Drag and Drop for Kanban Columns
   */
  function setupBoardDragAndDrop() {
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.kanban-column');

    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.taskId);
        card.style.opacity = '0.4';
      });

      card.addEventListener('dragend', () => {
        card.style.opacity = '1';
      });
    });

    columns.forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        col.style.backgroundColor = '#EFF6FF';
      });

      col.addEventListener('dragleave', () => {
        col.style.backgroundColor = '';
      });

      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.style.backgroundColor = '';
        const taskId = e.dataTransfer.getData('text/plain');
        const targetStatus = col.dataset.columnStatus;

        if (taskId && targetStatus) {
          const task = tasks.find(t => t.id == taskId);
          if (task && task.status !== targetStatus) {
            task.status = targetStatus;
            showToast(`Moved "${task.title}" to ${targetStatus}`);
            render();
            if (typeof TaskFlowAPI !== 'undefined') {
              TaskFlowAPI.updateTask(task.id, { status: targetStatus }).catch(err => {
                console.error('Failed to update task status:', err);
              });
            }
          }
        }
      });
    });
  }

  /**
   * Close all active row 3-dot menus
   */
  function closeAllRowMenus() {
    document.querySelectorAll('.row-actions-menu.active').forEach(menu => {
      menu.classList.remove('active');
    });
  }

  /**
   * Toggle task completed / in progress status
   */
  async function toggleTaskStatus(taskId) {
    const task = tasks.find(t => t.id == taskId);
    if (!task) return;

    const newStatus = task.status === 'Completed' ? 'In Progress' : 'Completed';
    task.status = newStatus;
    showToast(newStatus === 'Completed' ? `Completed task: "${task.title}"` : `Marked "${task.title}" as In Progress`);
    render();

    if (typeof TaskFlowAPI !== 'undefined') {
      try {
        await TaskFlowAPI.updateTask(task.id, { status: newStatus });
      } catch (err) {
        console.error('Failed to update status on server:', err);
      }
    }
  }

  /**
   * Open Delete Confirmation Modal
   */
  function openDeleteModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    activeDeletingTaskId = taskId;
    if (elements.deleteTaskNameTarget) {
      elements.deleteTaskNameTarget.textContent = `"${task.title}"`;
    }

    elements.deleteConfirmModal.classList.add('open');
    elements.deleteConfirmModal.setAttribute('aria-hidden', 'false');
  }

  function closeDeleteModal() {
    if (!elements.deleteConfirmModal) return;
    elements.deleteConfirmModal.classList.remove('open');
    elements.deleteConfirmModal.setAttribute('aria-hidden', 'true');
    activeDeletingTaskId = null;
  }

  /**
   * Open Task Details Modal
   */
  function openTaskDetailsModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    activeDetailTaskId = taskId;

    if (elements.detailProjectTag) elements.detailProjectTag.textContent = task.project;
    if (elements.detailPriorityTag) {
      elements.detailPriorityTag.textContent = task.priority;
      elements.detailPriorityTag.className = `detail-priority-tag ${
        task.priority === 'High' ? 'pri-high' : task.priority === 'Low' ? 'pri-low' : 'pri-medium'
      }`;
    }
    if (elements.detailStatusTag) {
      elements.detailStatusTag.textContent = task.status;
      elements.detailStatusTag.className = `detail-status-tag ${
        task.status === 'Completed' ? 'status-completed' : task.status === 'To Do' ? 'status-todo' : 'status-inprogress'
      }`;
    }
    if (elements.detailTaskTitle) elements.detailTaskTitle.textContent = task.title;
    if (elements.detailTaskDescription) {
      elements.detailTaskDescription.textContent = task.description || 'No description provided for this task.';
    }
    if (elements.detailDueDateVal) elements.detailDueDateVal.textContent = task.dueDate;
    if (elements.detailAssigneeVal) elements.detailAssigneeVal.textContent = task.assigneeName || task.assignee;
    if (elements.detailTaskIdVal) elements.detailTaskIdVal.textContent = task.code || task.id;

    if (elements.toggleTaskCompleteFromDetailBtn) {
      elements.toggleTaskCompleteFromDetailBtn.textContent = task.status === 'Completed' ? 'Mark Incomplete' : 'Mark Complete';
    }

    elements.taskDetailsModal.classList.add('open');
    elements.taskDetailsModal.setAttribute('aria-hidden', 'false');
  }

  function closeTaskDetailsModal() {
    if (!elements.taskDetailsModal) return;
    elements.taskDetailsModal.classList.remove('open');
    elements.taskDetailsModal.setAttribute('aria-hidden', 'true');
    activeDetailTaskId = null;
  }

  /**
   * Open Create Task Modal
   */
  function openCreateTaskModal(defaultStatus = 'To Do') {
    if (!elements.taskModal) return;

    elements.taskFormId.value = '';
    elements.modalTaskHeading.textContent = 'Create New Task';
    elements.modalTaskSubheading.textContent = 'Add a task to your workspace and keep your project moving.';
    elements.saveTaskModalBtn.textContent = 'Create Task';

    elements.taskTitleInput.value = '';
    elements.taskDescInput.value = '';
    elements.taskProjectSelect.value = 'Website Redesign';
    elements.taskPrioritySelect.value = 'Medium';
    elements.taskStatusSelect.value = defaultStatus;
    elements.taskDueDateInput.value = '2026-10-15';
    elements.taskAssigneeSelect.value = 'YB';

    elements.taskModal.classList.add('open');
    elements.taskModal.setAttribute('aria-hidden', 'false');
    elements.taskTitleInput.focus();
  }

  /**
   * Open Edit Task Modal
   */
  function openEditTaskModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    elements.taskFormId.value = task.id;
    elements.modalTaskHeading.textContent = 'Edit Task';
    elements.modalTaskSubheading.textContent = 'Update task details, schedule, priority, and assignees.';
    elements.saveTaskModalBtn.textContent = 'Save Changes';

    elements.taskTitleInput.value = task.title;
    elements.taskDescInput.value = task.description || '';
    elements.taskProjectSelect.value = task.project;
    elements.taskPrioritySelect.value = task.priority;
    elements.taskStatusSelect.value = task.status;
    elements.taskDueDateInput.value = task.dueDateRaw || '2026-10-15';
    elements.taskAssigneeSelect.value = task.assignee || 'YB';

    elements.taskModal.classList.add('open');
    elements.taskModal.setAttribute('aria-hidden', 'false');
    elements.taskTitleInput.focus();
  }

  function closeTaskModal() {
    if (!elements.taskModal) return;
    elements.taskModal.classList.remove('open');
    elements.taskModal.setAttribute('aria-hidden', 'true');
    elements.taskForm.reset();
  }

  /**
   * Handle Task Form Submit (Create or Update)
   */
  async function handleTaskFormSubmit(e) {
    e.preventDefault();

    const title = elements.taskTitleInput.value.trim();
    if (!title) {
      alert('Task title is required.');
      return;
    }

    const editId = elements.taskFormId.value;
    const project = elements.taskProjectSelect.value;
    const priority = elements.taskPrioritySelect.value;
    const status = elements.taskStatusSelect.value;
    const dueDateRaw = elements.taskDueDateInput.value;
    const description = elements.taskDescInput.value.trim();

    if (!project) {
      alert('Please select a project for this task.');
      return;
    }

    const saveBtn = elements.saveTaskModalBtn;
    saveBtn.disabled = true;
    const origText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';

    try {
      if (editId && !String(editId).startsWith('task-')) {
        await TaskFlowAPI.updateTask(editId, {
          title,
          description,
          project: Number(project),
          priority,
          status,
          due_date: dueDateRaw || null
        });
        showToast(`Task "${title}" updated successfully.`);
      } else {
        await TaskFlowAPI.createTask({
          title,
          description,
          project: Number(project),
          priority,
          status,
          due_date: dueDateRaw || null
        });
        showToast(`Task "${title}" created successfully.`);
      }
      closeTaskModal();
      await fetchTasksFromAPI();
    } catch (err) {
      alert(err.message || 'Failed to save task to database.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = origText;
    }
  }

  /**
   * Initialize Summary Cards Click Filters
   */
  function initSummaryCards() {
    elements.summaryCards.forEach(card => {
      card.addEventListener('click', () => {
        const filter = card.dataset.filterStatus;
        if (cardStatusFilter === filter) {
          cardStatusFilter = 'all';
          elements.summaryCards.forEach(c => c.classList.remove('active-card'));
        } else {
          cardStatusFilter = filter;
          elements.summaryCards.forEach(c => c.classList.remove('active-card'));
          card.classList.add('active-card');
        }
        render();
      });
    });
  }

  /**
   * Initialize Tabs
   */
  function initTabs() {
    elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        render();
      });
    });
  }

  /**
   * Initialize Filters & Sorting
   */
  function initFiltersAndSorting() {
    elements.taskSearchFilterInput?.addEventListener('input', () => {
      render();
    });

    elements.projectFilterSelect?.addEventListener('change', () => {
      render();
    });

    elements.priorityFilterSelect?.addEventListener('change', () => {
      render();
    });

    elements.statusFilterSelect?.addEventListener('change', () => {
      render();
    });

    elements.sortControlSelect?.addEventListener('change', () => {
      render();
    });

    // Select all tasks checkbox in table
    elements.selectAllCheckbox?.addEventListener('change', () => {
      const isChecked = elements.selectAllCheckbox.checked;
      const visibleTasks = getFilteredTasks();
      visibleTasks.forEach(task => {
        task.status = isChecked ? 'Completed' : 'In Progress';
      });
      showToast(isChecked ? 'Marked visible tasks complete.' : 'Reset visible tasks.');
      render();
    });

    // Today Button in header
    elements.todayFilterBtn?.addEventListener('click', () => {
      // Focus Today tab
      currentTab = 'today';
      elements.tabBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.tab === 'today');
      });
      if (elements.datePickerInput) {
        elements.datePickerInput.value = '2026-10-11';
      }
      showToast("Filtered view to Today's tasks.");
      render();
    });

    // Date Picker Input
    elements.datePickerInput?.addEventListener('change', (e) => {
      const selectedDate = e.target.value;
      if (selectedDate) {
        showToast(`Date selector updated to ${selectedDate}`);
      }
    });

    // Column add buttons in Kanban
    document.querySelectorAll('.col-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const defaultStatus = btn.dataset.statusDefault || 'To Do';
        openCreateTaskModal(defaultStatus);
      });
    });
  }

  /**
   * Initialize View Toggles (List vs Board)
   */
  function initViewToggles() {
    elements.listViewToggleBtn?.addEventListener('click', () => {
      if (currentView === 'list') return;
      currentView = 'list';
      elements.listViewToggleBtn.classList.add('active');
      elements.listViewToggleBtn.setAttribute('aria-checked', 'true');
      elements.boardViewToggleBtn.classList.remove('active');
      elements.boardViewToggleBtn.setAttribute('aria-checked', 'false');
      render();
    });

    elements.boardViewToggleBtn?.addEventListener('click', () => {
      if (currentView === 'board') return;
      currentView = 'board';
      elements.boardViewToggleBtn.classList.add('active');
      elements.boardViewToggleBtn.setAttribute('aria-checked', 'true');
      elements.listViewToggleBtn.classList.remove('active');
      elements.listViewToggleBtn.setAttribute('aria-checked', 'false');
      render();
    });
  }

  /**
   * Initialize Modals
   */
  function initModals() {
    // Open Add Task Modal
    elements.addTaskHeaderBtn?.addEventListener('click', () => openCreateTaskModal('In Progress'));
    elements.emptyCreateTaskBtn?.addEventListener('click', () => openCreateTaskModal('To Do'));
    elements.actionCreateTask?.addEventListener('click', () => {
      closeAllDropdowns();
      openCreateTaskModal('To Do');
    });

    // Task Creation Form Submit
    elements.taskForm?.addEventListener('submit', handleTaskFormSubmit);

    // Close Task Creation Modal
    elements.closeTaskModalBtn?.addEventListener('click', closeTaskModal);
    elements.cancelTaskModalBtn?.addEventListener('click', closeTaskModal);
    elements.taskModal?.addEventListener('click', (e) => {
      if (e.target === elements.taskModal) closeTaskModal();
    });

    // Detail Modal Actions
    elements.closeDetailModalBtn?.addEventListener('click', closeTaskDetailsModal);
    elements.taskDetailsModal?.addEventListener('click', (e) => {
      if (e.target === elements.taskDetailsModal) closeTaskDetailsModal();
    });

    elements.editTaskFromDetailBtn?.addEventListener('click', () => {
      if (activeDetailTaskId) {
        const idToEdit = activeDetailTaskId;
        closeTaskDetailsModal();
        openEditTaskModal(idToEdit);
      }
    });

    elements.deleteTaskFromDetailBtn?.addEventListener('click', () => {
      if (activeDetailTaskId) {
        const idToDelete = activeDetailTaskId;
        closeTaskDetailsModal();
        openDeleteModal(idToDelete);
      }
    });

    elements.toggleTaskCompleteFromDetailBtn?.addEventListener('click', () => {
      if (activeDetailTaskId) {
        toggleTaskStatus(activeDetailTaskId);
        openTaskDetailsModal(activeDetailTaskId);
      }
    });

    // Delete Modal Actions
    elements.closeDeleteModalBtn?.addEventListener('click', closeDeleteModal);
    elements.cancelDeleteBtn?.addEventListener('click', closeDeleteModal);
    elements.deleteConfirmModal?.addEventListener('click', (e) => {
      if (e.target === elements.deleteConfirmModal) closeDeleteModal();
    });

    elements.confirmDeleteBtn?.addEventListener('click', async () => {
      if (activeDeletingTaskId) {
        const idToDelete = activeDeletingTaskId;
        const deletedIndex = tasks.findIndex(t => t.id == idToDelete);
        if (deletedIndex !== -1) {
          const deletedTask = tasks[deletedIndex];
          tasks.splice(deletedIndex, 1);
          showToast(`Deleted task: "${deletedTask.title}"`);
        }
        closeDeleteModal();
        render();

        if (typeof TaskFlowAPI !== 'undefined' && Number.isInteger(Number(idToDelete))) {
          try {
            await TaskFlowAPI.deleteTask(idToDelete);
          } catch (err) {
            console.error('Failed to delete task from backend:', err);
          }
        }
      }
    });
  }

  /**
   * Initialize Global Header Search & Suggestions
   */
  function initHeaderSearch() {
    const searchInput = document.getElementById('globalSearchInput');
    const resultsDropdown = document.getElementById('searchResultsDropdown');
    const resultsList = document.getElementById('searchResultsList');

    if (!searchInput || !resultsDropdown || !resultsList) return;

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) {
        resultsDropdown.classList.remove('active');
        resultsList.innerHTML = '';
        return;
      }

      // Search across current tasks and known project entities
      const matches = [];
      tasks.forEach(t => {
        if (t.title.toLowerCase().includes(q) || t.project.toLowerCase().includes(q)) {
          matches.push({ title: t.title, subtitle: `Task • ${t.project}`, taskId: t.id });
        }
      });

      ['Website Redesign', 'Mobile App', 'Marketing Campaign'].forEach(p => {
        if (p.toLowerCase().includes(q)) {
          matches.push({ title: p, subtitle: 'Project', project: p });
        }
      });

      if (matches.length === 0) {
        resultsList.innerHTML = `<div style="padding: 12px; font-size: 0.8125rem; color: #64748B; text-align: center;">No matching tasks or projects found.</div>`;
      } else {
        resultsList.innerHTML = matches.slice(0, 5).map(m => `
          <div class="search-result-item" data-task-id="${m.taskId || ''}" data-project="${m.project || ''}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <div>
              <div style="font-weight: 600; color: #0F172A;">${escapeHtml(m.title)}</div>
              <div style="font-size: 0.6875rem; color: #64748B;">${escapeHtml(m.subtitle)}</div>
            </div>
          </div>
        `).join('');

        resultsList.querySelectorAll('.search-result-item').forEach(item => {
          item.addEventListener('click', () => {
            const tId = item.dataset.taskId;
            const pName = item.dataset.project;
            resultsDropdown.classList.remove('active');
            searchInput.value = '';

            if (tId) {
              openTaskDetailsModal(tId);
            } else if (pName) {
              if (elements.projectFilterSelect) {
                elements.projectFilterSelect.value = pName;
                render();
                showToast(`Filtered tasks to ${pName}`);
              }
            }
          });
        });
      }

      resultsDropdown.classList.add('active');
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
        resultsDropdown.classList.remove('active');
      }
    });
  }

  /**
   * Initialize App Shell Navigation, Mobile Drawer & Header Dropdowns
   */
  function initShellNavigation() {
    // Dropdown Triggers
    const triggers = [
      { btn: 'workspaceBtn', menu: 'workspaceDropdown' },
      { btn: 'createNewBtn', menu: 'createDropdown' },
      { btn: 'notificationsBtn', menu: 'notifDropdown' },
      { btn: 'helpHeaderBtn', menu: 'helpDropdown' },
      { btn: 'profileBtn', menu: 'profileDropdown' }
    ];

    triggers.forEach(({ btn, menu }) => {
      const button = document.getElementById(btn);
      const dropdown = document.getElementById(menu);

      if (button && dropdown) {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = dropdown.classList.contains('active');
          closeAllDropdowns();
          closeAllRowMenus();
          if (!isOpen) {
            dropdown.classList.add('active');
            button.setAttribute('aria-expanded', 'true');
          }
        });
      }
    });

    // Header avatar button mirrors profile dropdown
    const headerAvatarBtn = document.getElementById('headerAvatarBtn');
    headerAvatarBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const profileDropdown = document.getElementById('profileDropdown');
      if (profileDropdown) {
        const isOpen = profileDropdown.classList.contains('active');
        closeAllDropdowns();
        closeAllRowMenus();
        if (!isOpen) {
          profileDropdown.classList.add('active');
        }
      }
    });

    // Workspace selection
    document.querySelectorAll('#workspaceDropdown .dropdown-item[data-workspace]').forEach(item => {
      item.addEventListener('click', () => {
        const wsName = item.dataset.workspace;
        const wsLabel = document.getElementById('currentWorkspaceName');
        if (wsLabel) wsLabel.textContent = wsName;
        document.querySelectorAll('#workspaceDropdown .dropdown-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        closeAllDropdowns();
        showToast(`Workspace switched to: ${wsName}`);
      });
    });

    // Create Project option in dropdown
    document.getElementById('actionCreateProject')?.addEventListener('click', () => {
      closeAllDropdowns();
      showToast('Project creation wizard will open in the next module.');
    });

    // Invite Team Member option
    document.getElementById('actionInviteMember')?.addEventListener('click', () => {
      closeAllDropdowns();
      const email = prompt('Enter team member email address:');
      if (email) {
        showToast(`Invitation sent to ${email}`);
      }
    });

    // Mark All Notifications Read
    document.getElementById('markAllReadBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.notif-item').forEach(n => n.classList.remove('unread'));
      const notifBadge = document.getElementById('notifBadge');
      if (notifBadge) notifBadge.style.display = 'none';
      showToast('All notifications marked as read.');
    });

    // Sidebar Project Filter Clicking
    document.querySelectorAll('#sidebarProjectsList .project-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const proj = btn.dataset.project;
        if (elements.projectFilterSelect) {
          elements.projectFilterSelect.value = proj;
          render();
          showToast(`Filtered tasks to ${proj}`);
        }
      });
    });

    // Sidebar Add Project Button
    document.getElementById('sidebarAddProjectBtn')?.addEventListener('click', () => {
      showToast('Create Project shortcut triggered.');
    });

    // Settings & Help bottom buttons
    document.getElementById('sidebarSettingsBtn')?.addEventListener('click', () => {
      showToast('Opening Workspace Settings.');
    });
    document.getElementById('sidebarHelpBtn')?.addEventListener('click', () => {
      showToast('Opening Help & Support documentation.');
    });

    // Mobile Hamburger & Backdrop Drawer
    const mobileHamburger = document.getElementById('mobileHamburgerBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const appSidebar = document.getElementById('appSidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    mobileHamburger?.addEventListener('click', () => {
      appSidebar?.classList.add('drawer-open');
      sidebarBackdrop?.classList.add('active');
    });

    const closeDrawer = () => {
      appSidebar?.classList.remove('drawer-open');
      sidebarBackdrop?.classList.remove('active');
    };

    closeSidebarBtn?.addEventListener('click', closeDrawer);
    sidebarBackdrop?.addEventListener('click', closeDrawer);

    // Global document click closes dropdowns
    document.addEventListener('click', () => {
      closeAllDropdowns();
      closeAllRowMenus();
    });
  }

  /**
   * Close all dropdowns
   */
  function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu.active').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('[aria-expanded="true"]').forEach(el => el.setAttribute('aria-expanded', 'false'));
  }

  /**
   * Keyboard shortcuts (Ctrl+K and Escape)
   */
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K for search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const globalSearch = document.getElementById('globalSearchInput');
        globalSearch?.focus();
      }

      // Escape key closes modals and dropdowns
      if (e.key === 'Escape') {
        closeAllDropdowns();
        closeAllRowMenus();
        closeTaskModal();
        closeTaskDetailsModal();
        closeDeleteModal();
      }
    });
  }

  /**
   * Helper: Escape HTML strings
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Lightweight Toast notification feedback
   */
  function showToast(message) {
    let container = document.getElementById('taskFlowToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'taskFlowToastContainer';
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
      background-color: #0F172A;
      color: #FFFFFF;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 0.8125rem;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
      display: flex;
      align-items: center;
      gap: 8px;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.25s ease;
      pointer-events: auto;
    `;
    toast.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    // Fade in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    // Fade out and remove
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => {
        toast.remove();
      }, 250);
    }, 2800);
  }

  return {
    init,
    showToast
  };
})();
