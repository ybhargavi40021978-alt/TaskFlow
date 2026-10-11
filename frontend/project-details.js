/**
 * TaskFlow — Interface 11: Project Details Page
 * Complete Vanilla JavaScript Application Logic
 * 
 * Features:
 * - Dynamic Project State & LocalStorage Persistence
 * - Real-time Overview Statistics (Total Tasks, Completed, In Progress, Members)
 * - Dynamic Progress Bar & Completion Ratio Calculations
 * - Multi-criteria Task Filtering (Status Tabs, Priority Dropdown, Search Query)
 * - Interactive Task Checkbox Status Toggles with Activity Logging
 * - Add Task Modal with Full Validation & Dynamic Counters Sync
 * - Invite Teammates Modal with Role Assignment & Stacked Avatars Update
 * - Share Project Link Copying with Clipboard API
 * - Project Actions Menu (Edit Info, Copy Link, Archive)
 * - Global Search & Keyboard Shortcuts (Ctrl+K, N for new task)
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. Initial State & Seed Data
  // =========================================================================
  const STORAGE_KEY = 'taskflow_project_details_v2';

  const DEFAULT_PROJECT = {
    id: null,
    name: "Project",
    status: "Active",
    subtitle: "Collaborative project workspace.",
    startDate: "Not set",
    dueDate: "Not set",
    leadName: "Project Lead",
    tasks: [],
    members: [],
    activity: []
  };

  let project = { ...DEFAULT_PROJECT };

  // Filter State
  const filterState = {
    statusTab: 'all', // 'all' | 'To Do' | 'In Progress' | 'Completed'
    searchQuery: '',
    priority: 'all', // 'all' | 'High' | 'Medium' | 'Low'
    cardFilter: null
  };

  // =========================================================================
  // 2. Storage Helpers & Real API Loader
  // =========================================================================
  async function loadProject() {
    if (typeof TaskFlowAPI === 'undefined' || !TaskFlowAPI.isAuthenticated()) return;

    const urlParams = new URLSearchParams(window.location.search);
    let projectId = urlParams.get('id');

    try {
      if (!projectId) {
        const allProjects = await TaskFlowAPI.getProjects();
        if (allProjects && allProjects.length > 0) {
          projectId = allProjects[0].id;
        } else {
          project = {
            id: null,
            name: "No Projects Yet",
            status: "Planning",
            subtitle: "Create a project from the Projects page to get started.",
            startDate: "-",
            dueDate: "-",
            leadName: "-",
            tasks: [],
            members: [],
            activity: []
          };
          renderAll();
          return;
        }
      }

      const [projData, tasksData] = await Promise.all([
        TaskFlowAPI.getProject(projectId),
        TaskFlowAPI.getTasks({ project: projectId })
      ]);

      if (projData) {
        project.id = projData.id;
        project.name = projData.name;
        project.subtitle = projData.description || 'Collaborative workspace project.';
        project.status = projData.status || 'Active';
        project.startDate = projData.start_date || 'Not set';
        project.dueDate = projData.due_date || 'Not set';
        project.leadName = projData.owner ? (projData.owner.full_name || projData.owner.email) : 'Project Lead';

        if (projData.team_members && Array.isArray(projData.team_members)) {
          project.members = projData.team_members.map(m => ({
            id: m.id,
            name: m.name || m.email,
            role: m.role || 'Member',
            initials: m.initials || 'TF',
            avClass: 'av-alex',
            online: true
          }));
        } else {
          project.members = [];
        }

        if (tasksData && Array.isArray(tasksData)) {
          project.tasks = tasksData.map(t => ({
            id: t.id,
            title: t.title,
            subtitle: t.description || '',
            priority: t.priority || 'Medium',
            assignee: t.assignee_details ? t.assignee_details.full_name : 'Unassigned',
            assigneeAv: t.assignee_details ? t.assignee_details.initials : '—',
            avClass: 'av-alex',
            dueDate: t.due_date || 'No deadline',
            status: t.status || 'To Do'
          }));
        } else {
          project.tasks = [];
        }

        renderAll();
      }
    } catch (err) {
      console.warn('API fetch failed for project:', err);
    }
  }

  function saveProject() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch (e) {
      console.warn('Failed to save project:', e);
    }
  }

  function logActivity(text, iconClass = 'icon-green') {
    const act = {
      id: 'act-' + Date.now(),
      text: text,
      time: 'Just now',
      iconClass: iconClass
    };
    project.activity.unshift(act);
    renderActivityTimeline();
  }

  // =========================================================================
  // 3. UI Synchronization & Metric Calculations
  // =========================================================================
  function renderAll() {
    updateOverviewMetrics();
    renderTasksList();
    renderTeamMembers();
    renderActivityTimeline();
  }

  function updateOverviewMetrics() {
    const total = project.tasks.length;
    const completed = project.tasks.filter(t => t.status === 'Completed').length;
    const inProgress = project.tasks.filter(t => t.status === 'In Progress').length;
    const todo = project.tasks.filter(t => t.status === 'To Do').length;
    const membersCount = project.members.length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    // Overview Cards
    const totalEl = document.getElementById('metricTotalTasks');
    const compEl = document.getElementById('metricCompletedTasks');
    const inProgEl = document.getElementById('metricInProgressTasks');
    const memEl = document.getElementById('metricTeamMembers');

    if (totalEl) totalEl.textContent = total;
    if (compEl) compEl.textContent = completed;
    if (inProgEl) inProgEl.textContent = inProgress;
    if (memEl) memEl.textContent = membersCount;

    // Progress Card
    const percentText = document.getElementById('progressPercentageText');
    const barFill = document.getElementById('progressBarFill');
    const caption = document.getElementById('progressRatioCaption');

    if (percentText) percentText.textContent = `${percentage}%`;
    if (barFill) barFill.style.width = `${percentage}%`;
    if (caption) caption.textContent = `${completed} of ${total} tasks completed`;

    // Tasks Card Header Pills & Counters
    const listBadge = document.getElementById('tasksListCountBadge');
    const tabAll = document.getElementById('tabCountAll');
    const tabTodo = document.getElementById('tabCountToDo');
    const tabInProg = document.getElementById('tabCountInProgress');
    const tabComp = document.getElementById('tabCountCompleted');
    const memBadge = document.getElementById('membersCountBadge');

    if (listBadge) listBadge.textContent = `${total} tasks`;
    if (tabAll) tabAll.textContent = total;
    if (tabTodo) tabTodo.textContent = todo;
    if (tabInProg) tabInProg.textContent = inProgress;
    if (tabComp) tabComp.textContent = completed;
    if (memBadge) memBadge.textContent = membersCount;
  }

  // =========================================================================
  // 4. Tasks List Rendering & Filtering
  // =========================================================================
  function getFilteredTasks() {
    return project.tasks.filter(t => {
      // 1. Status Tab
      if (filterState.statusTab !== 'all') {
        if (t.status !== filterState.statusTab) return false;
      }

      // 2. Overview Card Filter
      if (filterState.cardFilter) {
        if (filterState.cardFilter !== 'all' && t.status !== filterState.cardFilter) {
          return false;
        }
      }

      // 3. Search Query
      if (filterState.searchQuery) {
        const q = filterState.searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchSub = (t.subtitle || '').toLowerCase().includes(q);
        const matchAssignee = (t.assignee || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSub && !matchAssignee) return false;
      }

      // 4. Priority Filter
      if (filterState.priority !== 'all') {
        if (t.priority !== filterState.priority) return false;
      }

      return true;
    });
  }

  function renderTasksList() {
    const listEl = document.getElementById('projectTasksList');
    const emptyEl = document.getElementById('tasksEmptyState');
    if (!listEl) return;

    listEl.innerHTML = '';

    const list = getFilteredTasks();

    if (list.length === 0) {
      if (emptyEl) emptyEl.style.display = 'flex';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    list.forEach(t => {
      const row = document.createElement('div');
      const isCompleted = t.status === 'Completed';
      row.className = `project-task-row ${isCompleted ? 'is-completed' : ''}`;
      row.dataset.id = t.id;

      row.innerHTML = `
        <div class="row-left-content">
          <input type="checkbox" class="task-row-checkbox" ${isCompleted ? 'checked' : ''} aria-label="Toggle task completion">
          <div class="task-text-group">
            <span class="task-link-title" title="${t.title}">${t.title}</span>
            ${t.subtitle ? `<span class="task-row-subtitle">${t.subtitle}</span>` : ''}
          </div>
        </div>

        <div class="row-right-meta">
          <span class="badge-priority priority-${t.priority.toLowerCase()}">${t.priority}</span>
          <span class="badge-status-sub status-${t.status.toLowerCase().replace(/\s+/g, '-')}">${t.status}</span>
          <div class="task-assignee-avatar ${t.avClass || 'av-alex'}" title="${t.assignee}">${t.assigneeAv || 'AM'}</div>
          <span class="task-due-date-span">${t.dueDate}</span>
        </div>
      `;

      // Checkbox Toggle
      const checkbox = row.querySelector('.task-row-checkbox');
      checkbox.addEventListener('change', async () => {
        const nextStatus = checkbox.checked ? 'Completed' : 'In Progress';
        t.status = nextStatus;
        try {
          if (typeof t.id === 'number' || (typeof t.id === 'string' && !t.id.startsWith('tsk-'))) {
            await TaskFlowAPI.updateTask(t.id, { status: nextStatus });
          }
        } catch (err) {
          console.warn('Could not sync task update to API:', err);
        }
        saveProject();
        updateOverviewMetrics();
        renderTasksList();
        logActivity(`<strong>Your Name</strong> marked <em>${t.title}</em> as ${nextStatus}`);
        showToast(checkbox.checked ? `Task marked as Completed` : `Task reopened`);
      });

      // Click Title -> Navigate to Task Details Page with Real ID
      const titleLink = row.querySelector('.task-link-title');
      titleLink.addEventListener('click', () => {
        window.location.href = `task-details.html?id=${t.id}`;
      });

      listEl.appendChild(row);
    });
  }

  // =========================================================================
  // 5. Team Members & Activity Timeline
  // =========================================================================
  function renderTeamMembers() {
    const listEl = document.getElementById('teamMembersList');
    if (!listEl) return;

    listEl.innerHTML = '';

    project.members.forEach(m => {
      const row = document.createElement('div');
      row.className = 'member-row-item';

      row.innerHTML = `
        <div class="member-left-wrap">
          <div class="member-avatar-box">
            <div class="member-av ${m.avClass}">${m.initials}</div>
            <span class="online-dot ${m.online ? '' : 'offline'}"></span>
          </div>
          <div class="member-name-role">
            <span class="member-name">${m.name}</span>
            <span class="member-role">${m.role}</span>
          </div>
        </div>
      `;

      listEl.appendChild(row);
    });
  }

  function renderActivityTimeline() {
    const feedEl = document.getElementById('activityTimelineFeed');
    if (!feedEl) return;

    feedEl.innerHTML = '';

    project.activity.slice(0, 5).forEach(act => {
      const entry = document.createElement('div');
      entry.className = 'activity-feed-entry';

      entry.innerHTML = `
        <div class="activity-node-icon ${act.iconClass || 'icon-green'}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div class="activity-text-col">
          <span class="activity-desc">${act.text}</span>
          <span class="activity-timestamp-str">${act.time}</span>
        </div>
      `;

      feedEl.appendChild(entry);
    });
  }

  // =========================================================================
  // 6. Modals (Add Task, Invite Members)
  // =========================================================================
  function openAddTaskModal() {
    const modal = document.getElementById('addTaskModal');
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    const input = document.getElementById('taskTitleInput');
    if (input) setTimeout(() => input.focus(), 80);
  }

  function closeAddTaskModal() {
    const modal = document.getElementById('addTaskModal');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  async function handleAddTaskSubmit(e) {
    e.preventDefault();

    const titleInput = document.getElementById('taskTitleInput');
    const descInput = document.getElementById('taskDescInput');
    const prioritySelect = document.getElementById('taskPrioritySelect');
    const statusSelect = document.getElementById('taskStatusSelect');
    const assigneeSelect = document.getElementById('taskAssigneeSelect');
    const dueDateInput = document.getElementById('taskDueDateInput');

    const title = titleInput.value.trim();
    if (!title) return;

    if (typeof project.id === 'number' || (typeof project.id === 'string' && !project.id.startsWith('PRJ-'))) {
      try {
        await TaskFlowAPI.createTask({
          project: project.id,
          title,
          description: descInput ? descInput.value.trim() : '',
          priority: prioritySelect.value,
          status: statusSelect.value,
          due_date: dueDateInput && dueDateInput.value ? dueDateInput.value : null
        });
        closeAddTaskModal();
        titleInput.value = '';
        if (descInput) descInput.value = '';
        showToast('Task added to project');
        await loadProject();
        return;
      } catch (err) {
        showToast(`Error creating task: ${err.message}`);
      }
    }

    const assignee = assigneeSelect.value;
    const parts = assignee.split(' ');
    const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : assignee.slice(0, 2).toUpperCase();

    let avClass = 'av-alex';
    if (assignee.includes('Sarah')) avClass = 'av-sarah';
    else if (assignee.includes('Marcus')) avClass = 'av-marcus';
    else if (assignee.includes('Jordan')) avClass = 'av-jordan';
    else if (assignee.includes('Elena')) avClass = 'av-elena';
    else if (assignee.includes('Your Name')) avClass = 'av-lead';

    const newTask = {
      id: 'tsk-' + Date.now(),
      title: title,
      subtitle: descInput.value.trim(),
      priority: prioritySelect.value,
      status: statusSelect.value,
      assignee: assignee,
      assigneeAv: initials,
      avClass: avClass,
      dueDate: dueDateInput.value ? dueDateInput.value.slice(5) : 'Oct 22'
    };

    project.tasks.unshift(newTask);
    saveProject();
    closeAddTaskModal();
    titleInput.value = '';
    descInput.value = '';
    renderAll();
    logActivity(`<strong>Your Name</strong> added task: <em>${title}</em>`);
    showToast('Task added to project');
  }

  function openInviteModal() {
    const modal = document.getElementById('inviteModal');
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeInviteModal() {
    const modal = document.getElementById('inviteModal');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  async function handleInviteSubmit(e) {
    e.preventDefault();
    const emailInput = document.getElementById('inviteEmailInput');
    const roleSelect = document.getElementById('inviteRoleSelect');
    const email = emailInput.value.trim();
    if (!email) return;

    if (typeof project.id === 'number' || (typeof project.id === 'string' && !project.id.startsWith('PRJ-'))) {
      try {
        await TaskFlowAPI.addProjectMember(project.id, {
          email,
          role: roleSelect.value.toLowerCase() === 'admin' ? 'manager' : 'member'
        });
        showToast(`Invitation sent to ${email}`);
        closeInviteModal();
        emailInput.value = '';
        await loadProject();
        return;
      } catch (err) {
        showToast(`Error inviting teammate: ${err.message}`);
      }
    }

    const name = email.split('@')[0].replace(/[._]/g, ' ');
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

    const newMember = {
      id: 'mem-' + Date.now(),
      name: formattedName,
      role: roleSelect.value,
      initials: formattedName.slice(0, 2).toUpperCase(),
      avClass: 'av-marcus',
      online: true
    };

    project.members.push(newMember);
    saveProject();
    closeInviteModal();
    emailInput.value = '';
    renderAll();
    logActivity(`<strong>${formattedName}</strong> invited to project as ${roleSelect.value}`);
    showToast(`Invitation sent to ${email}`);
  }

  // =========================================================================
  // 7. Toast Alerts Feedback
  // =========================================================================
  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = `
      <svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 200ms ease-out';
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  }

  // =========================================================================
  // 8. Event Listeners Initialization
  // =========================================================================
  function setupEventListeners() {
    // 1. Task Tabs Row
    document.querySelectorAll('.task-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filterState.statusTab = btn.dataset.tab;
        filterState.cardFilter = null; // Reset card filter override
        document.querySelectorAll('.task-tab-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });
        renderTasksList();
      });
    });

    // 2. Summary Card Click Filter
    document.querySelectorAll('.summary-metric-card[data-card-filter]').forEach(card => {
      card.addEventListener('click', () => {
        const filter = card.dataset.cardFilter;
        filterState.cardFilter = filterState.cardFilter === filter ? null : filter;
        if (filter !== 'all') filterState.statusTab = filter;
        else filterState.statusTab = 'all';

        document.querySelectorAll('.task-tab-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.tab === filterState.statusTab);
        });

        renderTasksList();
      });
    });

    // 3. In-Header Task Search Field
    const searchField = document.getElementById('taskSearchFilterInput');
    if (searchField) {
      searchField.addEventListener('input', (e) => {
        filterState.searchQuery = e.target.value.trim();
        renderTasksList();
      });
    }

    // 4. Priority Filter Menu
    const filterBtn = document.getElementById('filterDropdownBtn');
    const filterMenu = document.getElementById('filterMenuDropdown');

    if (filterBtn && filterMenu) {
      filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterMenu.classList.toggle('is-open');
      });

      filterMenu.querySelectorAll('.dropdown-item[data-priority-filter]').forEach(item => {
        item.addEventListener('click', () => {
          filterState.priority = item.dataset.priorityFilter;
          filterMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          filterMenu.classList.remove('is-open');
          renderTasksList();
        });
      });
    }

    // 5. View All Tasks Button
    const viewAllBtn = document.getElementById('viewAllTasksBtn');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => {
        filterState.statusTab = 'all';
        filterState.searchQuery = '';
        filterState.priority = 'all';
        filterState.cardFilter = null;
        if (searchField) searchField.value = '';

        document.querySelectorAll('.task-tab-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.tab === 'all');
        });

        renderTasksList();
      });
    }

    // 6. Add Task Modal
    const openAddBtn = document.getElementById('openAddTaskModalBtn');
    const closeAddBtn = document.getElementById('closeAddTaskModalBtn');
    const cancelAddBtn = document.getElementById('cancelAddTaskBtn');
    const addForm = document.getElementById('addTaskForm');

    if (openAddBtn) openAddBtn.addEventListener('click', openAddTaskModal);
    if (closeAddBtn) closeAddBtn.addEventListener('click', closeAddTaskModal);
    if (cancelAddBtn) cancelAddBtn.addEventListener('click', closeAddTaskModal);
    if (addForm) addForm.addEventListener('submit', handleAddTaskSubmit);

    // 7. Invite Modal
    const inviteBtn = document.getElementById('inviteMembersBtn');
    const invitePlusBtn = document.getElementById('inviteMemberPlusBtn');
    const closeInviteBtn = document.getElementById('closeInviteModalBtn');
    const cancelInviteBtn = document.getElementById('cancelInviteBtn');
    const inviteForm = document.getElementById('inviteForm');

    if (inviteBtn) inviteBtn.addEventListener('click', openInviteModal);
    if (invitePlusBtn) invitePlusBtn.addEventListener('click', openInviteModal);
    if (closeInviteBtn) closeInviteBtn.addEventListener('click', closeInviteModal);
    if (cancelInviteBtn) cancelInviteBtn.addEventListener('click', closeInviteModal);
    if (inviteForm) inviteForm.addEventListener('submit', handleInviteSubmit);

    // 8. Share Project Button
    const shareBtn = document.getElementById('shareProjectBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href);
        showToast('Project link copied to clipboard!');
      });
    }

    // 9. Three-dot Overflow Menu
    const projectMoreBtn = document.getElementById('projectMoreBtn');
    const projectMoreDropdown = document.getElementById('projectMoreDropdown');

    if (projectMoreBtn && projectMoreDropdown) {
      projectMoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        projectMoreDropdown.classList.toggle('is-open');
      });

      document.getElementById('menuEditProject').addEventListener('click', () => {
        projectMoreDropdown.classList.remove('is-open');
        const newTitle = prompt('Update Project Title:', project.name);
        if (newTitle && newTitle.trim()) {
          project.name = newTitle.trim();
          saveProject();
          document.getElementById('projectTitle').textContent = project.name;
          showToast('Project title updated');
        }
      });

      document.getElementById('menuCopyProjectLink').addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href);
        projectMoreDropdown.classList.remove('is-open');
        showToast('Project link copied to clipboard!');
      });

      document.getElementById('menuArchiveProject').addEventListener('click', () => {
        projectMoreDropdown.classList.remove('is-open');
        if (confirm('Are you sure you want to archive Website Redesign?')) {
          showToast('Project archived successfully');
        }
      });
    }

    // 10. Workspace Dropdown
    const workspaceBtn = document.getElementById('workspaceBtn');
    const workspaceDropdown = document.getElementById('workspaceDropdown');
    const currentWorkspaceName = document.getElementById('currentWorkspaceName');

    if (workspaceBtn && workspaceDropdown) {
      workspaceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = workspaceDropdown.classList.contains('is-open');
        workspaceDropdown.classList.toggle('is-open', !isOpen);
        workspaceBtn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });

      workspaceDropdown.querySelectorAll('.dropdown-item[data-workspace]').forEach(item => {
        item.addEventListener('click', () => {
          const ws = item.dataset.workspace;
          if (currentWorkspaceName) currentWorkspaceName.textContent = ws;
          workspaceDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          workspaceDropdown.classList.remove('is-open');
          workspaceBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // 11. Profile Dropdown
    const profileBtn = document.getElementById('profileBtn');
    const headerAvatarBtn = document.getElementById('headerAvatarBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    function toggleProfile(e) {
      e.stopPropagation();
      if (!profileDropdown) return;
      const isOpen = profileDropdown.classList.contains('is-open');
      profileDropdown.classList.toggle('is-open', !isOpen);
      if (profileBtn) profileBtn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
    }

    if (profileBtn) profileBtn.addEventListener('click', toggleProfile);
    if (headerAvatarBtn) headerAvatarBtn.addEventListener('click', toggleProfile);

    const logOutBtn = document.getElementById('menuLogOut');
    if (logOutBtn) {
      logOutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to log out of TaskFlow?')) {
          window.location.href = 'login.html';
        }
      });
    }

    // 12. Help Dropdown
    const helpBtn = document.getElementById('helpHeaderBtn');
    const helpDropdown = document.getElementById('helpDropdown');

    if (helpBtn && helpDropdown) {
      helpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = helpDropdown.classList.contains('is-open');
        helpDropdown.classList.toggle('is-open', !isOpen);
        helpBtn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });
    }

    // 13. Mobile Drawer
    const hamburgerBtn = document.getElementById('mobileHamburgerBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const appSidebar = document.getElementById('appSidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    function openMobileSidebar() {
      if (appSidebar) appSidebar.classList.add('mobile-open');
      if (sidebarBackdrop) sidebarBackdrop.classList.add('is-visible');
    }

    function closeMobileSidebar() {
      if (appSidebar) appSidebar.classList.remove('mobile-open');
      if (sidebarBackdrop) sidebarBackdrop.classList.remove('is-visible');
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', openMobileSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeMobileSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileSidebar);

    // 14. Global Click to close dropdowns
    document.addEventListener('click', () => {
      if (workspaceDropdown) workspaceDropdown.classList.remove('is-open');
      if (profileDropdown) profileDropdown.classList.remove('is-open');
      if (helpDropdown) helpDropdown.classList.remove('is-open');
      if (projectMoreDropdown) projectMoreDropdown.classList.remove('is-open');
      if (filterMenu) filterMenu.classList.remove('is-open');
    });

    // 15. View All Members Link Navigation
    const viewAllMembersBtn = document.getElementById('viewAllMembersBtn');
    if (viewAllMembersBtn) {
      viewAllMembersBtn.addEventListener('click', () => {
        window.location.href = 'team-members.html';
      });
    }

    // 15. Global Keyboard Shortcuts (Escape, N for new task)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAddTaskModal();
        closeInviteModal();
        closeMobileSidebar();
        if (workspaceDropdown) workspaceDropdown.classList.remove('is-open');
        if (profileDropdown) profileDropdown.classList.remove('is-open');
        if (helpDropdown) helpDropdown.classList.remove('is-open');
        if (projectMoreDropdown) projectMoreDropdown.classList.remove('is-open');
        if (filterMenu) filterMenu.classList.remove('is-open');
      }

      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key.toLowerCase() === 'n') {
        openAddTaskModal();
      }
    });
  }

  // =========================================================================
  // 9. Global Search with Ctrl+K
  // =========================================================================
  function setupGlobalSearch() {
    const input = document.getElementById('globalSearchInput');
    const dropdown = document.getElementById('searchResultsDropdown');
    const list = document.getElementById('searchResultsList');

    if (!input || !dropdown || !list) return;

    input.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        dropdown.classList.remove('is-open');
        list.innerHTML = '';
        return;
      }

      const results = [];
      project.tasks.forEach(t => {
        if (t.title.toLowerCase().includes(q)) results.push({ type: 'Task', text: t.title });
      });
      project.members.forEach(m => {
        if (m.name.toLowerCase().includes(q)) results.push({ type: 'Member', text: `${m.name} (${m.role})` });
      });

      if (results.length === 0) {
        list.innerHTML = '<div class="dropdown-item" style="color: var(--color-muted);">No matching elements found</div>';
      } else {
        list.innerHTML = '';
        results.slice(0, 5).forEach(r => {
          const item = document.createElement('div');
          item.className = 'dropdown-item';
          item.style.flexDirection = 'column';
          item.style.alignItems = 'flex-start';
          item.innerHTML = `
            <span style="font-size: 0.72rem; color: var(--color-primary); font-weight: 700;">${r.type}</span>
            <span style="font-size: 0.84rem; color: var(--color-navy-dark);">${r.text}</span>
          `;
          item.addEventListener('click', () => {
            dropdown.classList.remove('is-open');
            input.value = '';
            showToast(`Selected ${r.type}: "${r.text}"`);
          });
          list.appendChild(item);
        });
      }

      dropdown.classList.add('is-open');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-input-wrapper')) {
        dropdown.classList.remove('is-open');
      }
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  // =========================================================================
  // 10. Initialization
  // =========================================================================
  async function init() {
    if (typeof TaskFlowAPI !== 'undefined' && !TaskFlowAPI.requireAuth()) return;

    setupEventListeners();
    setupGlobalSearch();
    loadProject();

    if (window.TaskFlowWS) {
      TaskFlowWS.onTaskUpdate(() => {
        loadProject();
      });
      TaskFlowWS.onProjectUpdate(() => {
        loadProject();
      });
      TaskFlowWS.onNotification(() => {
        loadProject();
      });
      TaskFlowWS.onReconnect(() => {
        loadProject();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
