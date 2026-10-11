/**
 * TaskFlow — Modern Collaborative Project Management Web Application
 * Interface 4: Main Dashboard Logic (Full-Stack Connected)
 * File: dashboard.js
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!TaskFlowAPI.requireAuth()) return;

  initUserProfile();
  initSidebarNavigation();
  initDropdownMenus();
  initGlobalSearch();
  initModals();
  initMobileDrawer();
  initProgressFilter();

  loadDashboardData();
  setupRealtimeUpdates();
});

let currentLoadedTasks = [];
let currentLoadedProjects = [];

/**
 * 0. User Profile Display
 */
async function initUserProfile() {
  try {
    let user = TaskFlowAPI.getUser();
    if (!user) {
      const meRes = await TaskFlowAPI.getMe();
      user = meRes.user;
    }

    if (user) {
      const name = user.full_name || user.username || 'Workspace User';
      const firstName = user.first_name || name.split(' ')[0] || 'Member';
      const initials = user.initials || 'TF';

      const greeting = document.getElementById('dynamicWelcomeGreeting');
      if (greeting) {
        greeting.textContent = `Good day, ${firstName} 👋`;
      }

      const sidebarName = document.getElementById('sidebarUserName');
      if (sidebarName) sidebarName.textContent = name;

      const sidebarAvatar = document.getElementById('sidebarAvatar');
      if (sidebarAvatar) sidebarAvatar.textContent = initials;

      const headerAvatar = document.querySelector('#headerAvatarBtn span');
      if (headerAvatar) headerAvatar.textContent = initials;
    }
  } catch (err) {
    console.warn('Could not load user profile:', err);
  }
}

/**
 * 1. Fetch & Render Real Database Data
 */
async function loadDashboardData() {
  await Promise.allSettled([
    loadSummaryMetrics(),
    loadProjects(),
    loadMyTasks(),
    loadActivityFeed(),
    loadNotificationsList(),
  ]);
}

async function loadSummaryMetrics() {
  try {
    const summary = await TaskFlowAPI.getDashboardSummary();
    if (!summary) return;

    const elTotal = document.getElementById('metricTotalProjects');
    const elMyTasks = document.getElementById('metricMyTasks');
    const elInProgress = document.getElementById('metricInProgress');
    const elCompleted = document.getElementById('metricCompleted');
    const elActiveBadge = document.getElementById('taskActiveCount');
    const elSidebarBadge = document.getElementById('sidebarMyTasksBadge');

    if (elTotal) elTotal.textContent = String(summary.total_projects || 0);
    if (elMyTasks) elMyTasks.textContent = String(summary.my_tasks_count || 0);
    if (elInProgress) elInProgress.textContent = String(summary.in_progress_tasks || 0);
    if (elCompleted) elCompleted.textContent = String(summary.completed_tasks || 0);
    if (elActiveBadge) elActiveBadge.textContent = String(summary.my_tasks_count || 0);
    if (elSidebarBadge) elSidebarBadge.textContent = String(summary.my_tasks_count || 0);

    // Render upcoming deadlines
    if (summary.upcoming_deadlines) {
      renderUpcomingDeadlines(summary.upcoming_deadlines);
    }
  } catch (err) {
    console.warn('Error loading summary metrics:', err);
  }
}

async function loadProjects() {
  try {
    const projects = await TaskFlowAPI.getProjects();
    currentLoadedProjects = projects || [];

    // Populate sidebar projects list
    const sidebarList = document.getElementById('sidebarProjectsList');
    if (sidebarList) {
      sidebarList.innerHTML = '';
      if (currentLoadedProjects.length === 0) {
        sidebarList.innerHTML = '<li class="project-item"><span style="font-size:0.75rem; color:#94A3B8; padding:8px 12px; display:block;">No projects yet</span></li>';
      } else {
        currentLoadedProjects.slice(0, 5).forEach(proj => {
          const li = document.createElement('li');
          li.className = 'project-item';
          li.innerHTML = `
            <a href="project-details.html?id=${proj.id}" class="project-btn" style="text-decoration:none;">
              <span class="project-dot dot-${proj.color || 'blue'}"></span>
              <span class="project-name">${escapeHtml(proj.name)}</span>
            </a>
          `;
          sidebarList.appendChild(li);
        });
      }
    }

    // Populate modal project selector
    const projectSelect = document.getElementById('newTaskProjectSelect');
    if (projectSelect) {
      projectSelect.innerHTML = '';
      currentLoadedProjects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        projectSelect.appendChild(opt);
      });
    }

    // Populate Project Progress list
    renderProjectProgress(currentLoadedProjects);
  } catch (err) {
    console.warn('Error loading projects:', err);
  }
}

function renderProjectProgress(projects) {
  const stack = document.querySelector('.progress-rows-stack');
  if (!stack) return;

  if (!projects || projects.length === 0) {
    stack.innerHTML = '<p style="font-size:0.875rem; color:#64748B; padding:16px;">Create a project to see progress metrics.</p>';
    return;
  }

  stack.innerHTML = '';
  projects.slice(0, 4).forEach(proj => {
    const pct = proj.progress || 0;
    const color = proj.color || 'blue';
    const total = proj.total_tasks || 0;
    const completed = proj.completed_tasks || 0;
    const remaining = Math.max(0, total - completed);

    const card = document.createElement('div');
    card.className = 'project-progress-card';
    card.innerHTML = `
      <div class="progress-title-row">
        <a href="project-details.html?id=${proj.id}" class="project-label-group" style="text-decoration:none;">
          <span class="project-dot dot-${color}"></span>
          <span class="project-title-name">${escapeHtml(proj.name)}</span>
        </a>
        <span class="progress-pct-val val-${color}">${pct}%</span>
      </div>
      <div class="progress-track-bar">
        <div class="progress-fill-${color}" style="width: ${pct}%;"></div>
      </div>
      <div class="progress-tasks-subtext">
        <span>${completed} of ${total} tasks completed</span>
        <span class="eta-tag">${remaining} remaining</span>
      </div>
    `;
    stack.appendChild(card);
  });
}

function renderUpcomingDeadlines(deadlines) {
  const container = document.querySelector('.deadlines-list');
  if (!container) return;

  if (!deadlines || deadlines.length === 0) {
    container.innerHTML = '<p style="font-size:0.875rem; color:#64748B; padding:16px;">No upcoming deadlines scheduled.</p>';
    return;
  }

  container.innerHTML = '';
  deadlines.forEach(task => {
    let month = 'DUE';
    let day = '—';
    if (task.due_date) {
      const d = new Date(task.due_date + 'T00:00:00');
      month = d.toLocaleString('en', { month: 'short' }).toUpperCase();
      day = d.getDate();
    }

    const priClass = task.priority === 'High' || task.priority === 'Urgent' ? 'pri-high' : task.priority === 'Low' ? 'pri-low' : 'pri-med';

    const row = document.createElement('div');
    row.className = 'deadline-row';
    row.style.cursor = 'pointer';
    row.innerHTML = `
      <div class="deadline-date-box ${task.priority === 'Urgent' ? 'date-urgent' : 'date-soon'}">
        <span class="date-box-month">${month}</span>
        <span class="date-box-day">${day}</span>
      </div>
      <div class="deadline-main-info">
        <span class="deadline-task-name">${escapeHtml(task.title)}</span>
        <span class="deadline-project-name">${escapeHtml(task.project_name || 'Project')}</span>
      </div>
      <div class="deadline-badge-wrap">
        <span class="priority-badge ${priClass}">${escapeHtml(task.priority)}</span>
      </div>
    `;
    row.addEventListener('click', () => {
      window.location.href = `task-details.html?id=${task.id}`;
    });
    container.appendChild(row);
  });
}

async function loadMyTasks() {
  try {
    const tasks = await TaskFlowAPI.getTasks({ my_tasks: true });
    currentLoadedTasks = tasks || [];
    renderDashboardTasks(currentLoadedTasks);
  } catch (err) {
    console.warn('Error loading my tasks:', err);
  }
}

function renderDashboardTasks(tasks) {
  const list = document.getElementById('dashboardTaskList');
  if (!list) return;

  if (!tasks || tasks.length === 0) {
    list.innerHTML = `
      <div style="padding: 24px; text-align: center; color: #64748B; font-size: 0.875rem;">
        No tasks assigned to you right now. Click <strong>+ Create New</strong> to create one!
      </div>
    `;
    return;
  }

  list.innerHTML = '';
  tasks.forEach(task => {
    const isCompleted = task.status === 'Completed';
    const priClass = task.priority === 'High' || task.priority === 'Urgent' ? 'pri-high' : task.priority === 'Low' ? 'pri-low' : 'pri-med';
    const dueDisplay = task.due_date ? task.due_date : 'No deadline';

    const row = document.createElement('div');
    row.className = `task-row ${isCompleted ? 'task-completed' : ''}`;
    row.dataset.id = task.id;
    row.dataset.priority = (task.priority || 'Medium').toLowerCase();

    row.innerHTML = `
      <div class="task-check-wrap">
        <input type="checkbox" class="task-checkbox" id="check-task-${task.id}" ${isCompleted ? 'checked' : ''} aria-label="Mark task complete">
      </div>
      <div class="task-main-col">
        <span class="task-name-text">${escapeHtml(task.title)}</span>
        <div class="task-sub-meta">
          <span class="task-project-tag tag-blue">${escapeHtml(task.project_name || 'Project')}</span>
          <span class="task-due-date">Due: ${escapeHtml(dueDisplay)}</span>
        </div>
      </div>
      <div class="task-priority-col">
        <span class="priority-badge ${priClass}">${escapeHtml(task.priority)}</span>
      </div>
    `;

    // Checkbox toggle
    const checkbox = row.querySelector('.task-checkbox');
    checkbox.addEventListener('change', async (e) => {
      e.stopPropagation();
      const newStatus = checkbox.checked ? 'Completed' : 'In Progress';
      try {
        await TaskFlowAPI.updateTask(task.id, { status: newStatus });
        row.classList.toggle('task-completed', checkbox.checked);
        showToast(`Task marked as ${newStatus}`);
        loadSummaryMetrics();
      } catch (err) {
        checkbox.checked = !checkbox.checked;
        showToast(`Error updating task: ${err.message}`);
      }
    });

    // Row click opens task details page
    row.addEventListener('click', (e) => {
      if (e.target.closest('.task-check-wrap')) return;
      window.location.href = `task-details.html?id=${task.id}`;
    });

    list.appendChild(row);
  });
}

async function loadActivityFeed() {
  try {
    const activities = await TaskFlowAPI.getDashboardActivity();
    const feed = document.querySelector('.activity-feed');
    if (!feed) return;

    if (!activities || activities.length === 0) {
      feed.innerHTML = '<p style="font-size: 0.875rem; color:#64748B; padding: 16px;">No workspace activity recorded yet.</p>';
      return;
    }

    feed.innerHTML = '';
    activities.slice(0, 6).forEach(act => {
      const user = act.user || {};
      const initials = user.initials || 'TF';
      const userName = user.full_name || 'User';

      let timeText = 'Just now';
      if (act.created_at) {
        const diffMs = Date.now() - new Date(act.created_at).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) timeText = `${Math.max(1, diffMins)}m ago`;
        else if (diffMins < 1440) timeText = `${Math.floor(diffMins / 60)}h ago`;
        else timeText = `${Math.floor(diffMins / 1440)}d ago`;
      }

      const row = document.createElement('div');
      row.className = 'activity-row';
      row.innerHTML = `
        <div class="activity-avatar av-blue">${escapeHtml(initials)}</div>
        <div class="activity-text-wrap">
          <p class="activity-narrative">
            <strong>${escapeHtml(userName)}</strong> ${escapeHtml(act.description)}
          </p>
          <span class="activity-time">${timeText}</span>
        </div>
      `;
      feed.appendChild(row);
    });
  } catch (err) {
    console.warn('Error loading activity feed:', err);
  }
}

async function loadNotificationsList() {
  try {
    const res = await TaskFlowAPI.getNotifications();
    if (!res) return;

    const notifBadge = document.getElementById('notifBadge');
    if (notifBadge) {
      if (res.unread_count > 0) {
        notifBadge.textContent = res.unread_count;
        notifBadge.style.display = 'flex';
      } else {
        notifBadge.textContent = '';
        notifBadge.style.display = 'none';
      }
    }

    const notifList = document.getElementById('notifList');
    if (notifList && res.results) {
      notifList.innerHTML = '';
      if (res.results.length === 0) {
        notifList.innerHTML = '<li style="padding:16px; font-size:0.84rem; color:#64748B; text-align:center;">No notifications</li>';
      } else {
        res.results.slice(0, 5).forEach(n => {
          const li = document.createElement('li');
          li.className = `notif-item ${n.is_read ? '' : 'unread'}`;
          li.innerHTML = `
            <div class="notif-avatar av-blue">${n.actor ? escapeHtml(n.actor.initials || 'TF') : 'TF'}</div>
            <div class="notif-text-wrap">
              <p class="notif-text">${escapeHtml(n.message)}</p>
              <span class="notif-time">${n.related_project_name ? escapeHtml(n.related_project_name) : ''}</span>
            </div>
          `;
          li.addEventListener('click', async () => {
            if (!n.is_read) {
              await TaskFlowAPI.markNotificationRead(n.id);
              loadNotificationsList();
            }
            if (n.related_task) {
              window.location.href = `task-details.html?id=${n.related_task}`;
            } else if (n.related_project) {
              window.location.href = `project-details.html?id=${n.related_project}`;
            }
          });
          notifList.appendChild(li);
        });
      }
    }
  } catch (err) {
    console.warn('Error loading notifications:', err);
  }
}

function setupRealtimeUpdates() {
  if (window.TaskFlowWS) {
    TaskFlowWS.onNotification(() => {
      loadDashboardData();
    });
    TaskFlowWS.onTaskUpdate(() => {
      loadDashboardData();
    });
    TaskFlowWS.onProjectUpdate(() => {
      loadDashboardData();
    });
    TaskFlowWS.onReconnect(() => {
      loadDashboardData();
    });
  }
}

/**
 * 2. Sidebar Navigation & Active Item Handling
 */
function initSidebarNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

/**
 * 3. Dropdown Menus Handling
 */
function initDropdownMenus() {
  const dropdownTriggers = [
    { btn: 'workspaceBtn', menu: 'workspaceDropdown' },
    { btn: 'profileBtn', menu: 'profileDropdown' },
    { btn: 'createNewBtn', menu: 'createDropdown' },
    { btn: 'notificationsBtn', menu: 'notifDropdown' },
    { btn: 'helpHeaderBtn', menu: 'helpDropdown' },
    { btn: 'filterTasksBtn', menu: 'filterTasksMenu' }
  ];

  dropdownTriggers.forEach(({ btn, menu }) => {
    const button = document.getElementById(btn);
    const dropdown = document.getElementById(menu);

    if (button && dropdown) {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('active');
        closeAllDropdowns();
        if (!isOpen) {
          dropdown.classList.add('active');
          button.setAttribute('aria-expanded', 'true');
        }
      });
    }
  });

  document.addEventListener('click', closeAllDropdowns);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllDropdowns();
  });

  // Mark all notifications read
  const markAllReadBtn = document.getElementById('markAllReadBtn');
  markAllReadBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await TaskFlowAPI.markAllNotificationsRead();
      loadNotificationsList();
      showToast('All notifications marked as read');
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  });

  // Task Filters
  const filterButtons = document.querySelectorAll('#filterTasksMenu .dropdown-item');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      if (filter === 'all') {
        renderDashboardTasks(currentLoadedTasks);
      } else if (filter === 'high') {
        renderDashboardTasks(currentLoadedTasks.filter(t => t.priority === 'High' || t.priority === 'Urgent'));
      } else if (filter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        renderDashboardTasks(currentLoadedTasks.filter(t => t.due_date === today));
      }
      closeAllDropdowns();
    });
  });
}

function closeAllDropdowns() {
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    menu.classList.remove('active');
  });
  document.querySelectorAll('[aria-expanded="true"]').forEach(el => {
    el.setAttribute('aria-expanded', 'false');
  });
}

/**
 * 4. Global Search
 */
function initGlobalSearch() {
  const searchInput = document.getElementById('globalSearchInput');
  const resultsDropdown = document.getElementById('searchResultsDropdown');
  const resultsList = document.getElementById('searchResultsList');

  if (!searchInput || !resultsDropdown || !resultsList) return;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (query.length === 0) {
      resultsDropdown.classList.remove('active');
      return;
    }

    const matchedTasks = currentLoadedTasks.filter(t => t.title.toLowerCase().includes(query));
    const matchedProjects = currentLoadedProjects.filter(p => p.name.toLowerCase().includes(query));

    resultsList.innerHTML = '';
    if (matchedTasks.length === 0 && matchedProjects.length === 0) {
      resultsList.innerHTML = `<div class="search-result-empty">No results found for "${escapeHtml(query)}"</div>`;
    } else {
      matchedProjects.forEach(p => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.innerHTML = `
          <div>
            <strong>📁 ${escapeHtml(p.name)}</strong>
            <span style="display:block; font-size: 0.6875rem; color: #64748B;">Project</span>
          </div>
        `;
        div.addEventListener('click', () => {
          window.location.href = `project-details.html?id=${p.id}`;
        });
        resultsList.appendChild(div);
      });

      matchedTasks.forEach(t => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.innerHTML = `
          <div>
            <strong>✅ ${escapeHtml(t.title)}</strong>
            <span style="display:block; font-size: 0.6875rem; color: #64748B;">Task • ${escapeHtml(t.project_name || '')}</span>
          </div>
        `;
        div.addEventListener('click', () => {
          window.location.href = `task-details.html?id=${t.id}`;
        });
        resultsList.appendChild(div);
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
 * 5. Modals Handling (Create Task, Create Project, Logout)
 */
function initModals() {
  const modalBackdrops = document.querySelectorAll('.app-modal-backdrop');

  modalBackdrops.forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('open');
    });
  });

  document.querySelectorAll('.modal-close-btn, .btn-modal-secondary').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.app-modal-backdrop')?.classList.remove('open');
    });
  });

  // Action: Create Task
  document.getElementById('actionCreateTask')?.addEventListener('click', () => {
    closeAllDropdowns();
    document.getElementById('createTaskModal')?.classList.add('open');
    document.getElementById('newTaskTitleInput')?.focus();
  });

  // Form submit: Create Task
  document.getElementById('createTaskForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const titleInput = document.getElementById('newTaskTitleInput');
    const projectSelect = document.getElementById('newTaskProjectSelect');
    const prioritySelect = document.getElementById('newTaskPrioritySelect');
    const dueInput = document.getElementById('newTaskDueDateInput');

    const title = titleInput.value.trim();
    const projectId = projectSelect?.value;
    if (!title || !projectId) {
      showToast('Please enter a task title and select a project.');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      const payload = {
        title,
        project: parseInt(projectId, 10),
        priority: prioritySelect ? prioritySelect.value : 'Medium',
        due_date: dueInput && dueInput.value ? dueInput.value : null,
      };
      await TaskFlowAPI.createTask(payload);
      document.getElementById('createTaskModal')?.classList.remove('open');
      titleInput.value = '';
      showToast(`Task "${title}" created successfully`);
      loadDashboardData();
    } catch (err) {
      showToast(`Error creating task: ${err.message}`);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // Action: Create Project
  const openProjectModal = () => {
    closeAllDropdowns();
    document.getElementById('createProjectModal')?.classList.add('open');
    document.getElementById('newProjectNameInput')?.focus();
  };

  document.getElementById('actionCreateProject')?.addEventListener('click', openProjectModal);
  document.getElementById('sidebarAddProjectBtn')?.addEventListener('click', openProjectModal);

  // Form submit: Create Project
  document.getElementById('createProjectForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const nameInput = document.getElementById('newProjectNameInput');
    const colorSelect = document.getElementById('newProjectColorSelect');
    const descInput = document.getElementById('newProjectDescInput');

    const projectName = nameInput.value.trim();
    if (!projectName) return;

    if (submitBtn) submitBtn.disabled = true;

    try {
      await TaskFlowAPI.createProject({
        name: projectName,
        color: colorSelect ? colorSelect.value : 'blue',
        description: descInput ? descInput.value.trim() : '',
      });
      document.getElementById('createProjectModal')?.classList.remove('open');
      nameInput.value = '';
      if (descInput) descInput.value = '';
      showToast(`Project "${projectName}" created successfully`);
      loadDashboardData();
    } catch (err) {
      showToast(`Error creating project: ${err.message}`);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // Action: Invite Member
  document.getElementById('actionInviteMember')?.addEventListener('click', () => {
    closeAllDropdowns();
    window.location.href = 'team-members.html';
  });

  // Action: Logout
  document.getElementById('menuLogOut')?.addEventListener('click', () => {
    closeAllDropdowns();
    document.getElementById('logoutModal')?.classList.add('open');
  });

  const confirmLogout = document.getElementById('confirmLogoutLink');
  if (confirmLogout) {
    confirmLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      await TaskFlowAPI.logout();
    });
  }

  // Navigation shortcuts
  document.getElementById('sidebarSettingsBtn')?.addEventListener('click', () => {
    window.location.href = 'settings.html';
  });
  document.getElementById('sidebarHelpBtn')?.addEventListener('click', () => {
    window.location.href = 'help-support.html';
  });
  document.getElementById('menuMyProfile')?.addEventListener('click', () => {
    window.location.href = 'my-profile.html';
  });
  document.getElementById('menuAccountSettings')?.addEventListener('click', () => {
    window.location.href = 'settings.html';
  });
  document.getElementById('viewAllTasksLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'my-tasks.html';
  });
  document.getElementById('viewCalendarLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'calendar.html';
  });
}

/**
 * 6. Mobile Sidebar Drawer
 */
function initMobileDrawer() {
  const hamburger = document.getElementById('mobileHamburgerBtn');
  const sidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const closeBtn = document.getElementById('closeSidebarBtn');

  if (!hamburger || !sidebar || !backdrop) return;

  const openDrawer = () => {
    sidebar.classList.add('drawer-open');
    backdrop.classList.add('active');
  };

  const closeDrawer = () => {
    sidebar.classList.remove('drawer-open');
    backdrop.classList.remove('active');
  };

  hamburger.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);
}

/**
 * 7. Progress Timeframe Filter
 */
function initProgressFilter() {
  const select = document.getElementById('progressTimeframeSelect');
  if (!select) return;

  select.addEventListener('change', () => {
    renderProjectProgress(currentLoadedProjects);
  });
}

/**
 * Toast Notification Helper
 */
function showToast(message) {
  let existingToast = document.querySelector('.taskflow-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'taskflow-toast';
  toast.textContent = message;

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    padding: '11px 18px',
    borderRadius: '8px',
    fontSize: '0.84rem',
    fontWeight: '500',
    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
    zIndex: '9999',
    opacity: '0',
    transform: 'translateY(10px)',
    transition: 'all 0.25s ease',
  });

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 2400);
}
window.showToast = showToast;

function escapeHtml(str) {
  if (!str) return '';
  const p = document.createElement('p');
  p.textContent = str;
  return p.innerHTML;
}
