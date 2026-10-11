/**
 * TaskFlow — Modern Collaborative Project Management Web Application
 * Interface 6: Projects Page Logic
 * File: projects.js
 */

document.addEventListener('DOMContentLoaded', () => {
  ProjectsManager.init();
});

/**
 * ProjectsManager Module
 * Handles local state, filtering, grid & list view rendering, modals, and shell controls.
 */
const ProjectsManager = (() => {
  // State
  let projects = [];
  let currentView = 'grid'; // 'grid' | 'list'
  let currentTab = 'all'; // 'all' | 'my' | 'shared' | 'archived'
  let cardStatusFilter = 'all'; // 'all' | 'Active' | 'Completed' | 'At Risk'
  let activeActionProjectId = null;

  // DOM Elements Cache
  const elements = {
    // Summary counts
    countTotalProjects: document.getElementById('countTotalProjects'),
    countActiveProjects: document.getElementById('countActiveProjects'),
    countCompletedProjects: document.getElementById('countCompletedProjects'),
    countAtRiskProjects: document.getElementById('countAtRiskProjects'),
    sidebarProjectsBadge: document.getElementById('sidebarProjectsBadge'),

    // Summary cards
    summaryCards: document.querySelectorAll('.summary-card'),

    // Navigation tabs
    tabBtns: document.querySelectorAll('.tab-btn'),

    // Toolbar filters
    projectSearchFilterInput: document.getElementById('projectSearchFilterInput'),
    statusFilterSelect: document.getElementById('statusFilterSelect'),
    teamFilterSelect: document.getElementById('teamFilterSelect'),
    sortControlSelect: document.getElementById('sortControlSelect'),

    // View toggles
    gridViewToggleBtn: document.getElementById('gridViewToggleBtn'),
    listViewToggleBtn: document.getElementById('listViewToggleBtn'),
    headerGridViewBtn: document.getElementById('headerGridViewBtn'),
    headerListViewBtn: document.getElementById('headerListViewBtn'),

    // View wrappers
    projectsGridWrapper: document.getElementById('projectsGridWrapper'),
    projectsCardsGrid: document.getElementById('projectsCardsGrid'),
    projectsTableWrapper: document.getElementById('projectsTableWrapper'),
    projectsTableBody: document.getElementById('projectsTableBody'),
    emptyStateContainer: document.getElementById('emptyStateContainer'),

    // Create / Edit Modal
    projectModal: document.getElementById('projectModal'),
    projectForm: document.getElementById('projectForm'),
    projectFormId: document.getElementById('projectFormId'),
    modalProjectHeading: document.getElementById('modalProjectHeading'),
    modalProjectSubheading: document.getElementById('modalProjectSubheading'),
    projectNameInput: document.getElementById('projectNameInput'),
    projectDescInput: document.getElementById('projectDescInput'),
    projectStatusSelect: document.getElementById('projectStatusSelect'),
    projectTeamSelect: document.getElementById('projectTeamSelect'),
    projectStartDateInput: document.getElementById('projectStartDateInput'),
    projectDueDateInput: document.getElementById('projectDueDateInput'),
    projectMembersSelect: document.getElementById('projectMembersSelect'),
    closeProjectModalBtn: document.getElementById('closeProjectModalBtn'),
    cancelProjectModalBtn: document.getElementById('cancelProjectModalBtn'),
    saveProjectModalBtn: document.getElementById('saveProjectModalBtn'),

    // Manage Members Modal
    membersModal: document.getElementById('membersModal'),
    membersProjectSubtitle: document.getElementById('membersProjectSubtitle'),
    inviteMemberInput: document.getElementById('inviteMemberInput'),
    inviteMemberBtn: document.getElementById('inviteMemberBtn'),
    membersListWrapper: document.getElementById('membersListWrapper'),
    closeMembersModalBtn: document.getElementById('closeMembersModalBtn'),
    closeMembersDoneBtn: document.getElementById('closeMembersDoneBtn'),

    // Delete Modal
    deleteProjectModal: document.getElementById('deleteProjectModal'),
    deleteProjectTargetName: document.getElementById('deleteProjectTargetName'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    cancelDeleteProjectBtn: document.getElementById('cancelDeleteProjectBtn'),
    confirmDeleteProjectBtn: document.getElementById('confirmDeleteProjectBtn'),

    // Archive Modal
    archiveProjectModal: document.getElementById('archiveProjectModal'),
    archiveProjectTargetName: document.getElementById('archiveProjectTargetName'),
    closeArchiveModalBtn: document.getElementById('closeArchiveModalBtn'),
    cancelArchiveProjectBtn: document.getElementById('cancelArchiveProjectBtn'),
    confirmArchiveProjectBtn: document.getElementById('confirmArchiveProjectBtn'),

    // Buttons
    newProjectHeaderBtn: document.getElementById('newProjectHeaderBtn'),
    emptyCreateProjectBtn: document.getElementById('emptyCreateProjectBtn'),
    actionCreateProject: document.getElementById('actionCreateProject'),
    sidebarAddProjectBtn: document.getElementById('sidebarAddProjectBtn'),
    quickFilterBtn: document.getElementById('quickFilterBtn')
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

    await fetchProjectsFromAPI();

    if (window.TaskFlowWS) {
      TaskFlowWS.onProjectUpdate(() => {
        fetchProjectsFromAPI();
      });
      TaskFlowWS.onTaskUpdate(() => {
        fetchProjectsFromAPI();
      });
      TaskFlowWS.onNotification(() => {
        fetchProjectsFromAPI();
      });
      TaskFlowWS.onReconnect(() => {
        fetchProjectsFromAPI();
      });
    }
  }

  async function fetchProjectsFromAPI() {
    try {
      const serverProjects = await TaskFlowAPI.getProjects();
      if (serverProjects && Array.isArray(serverProjects)) {
        projects = serverProjects.map(p => {
          let friendlyDue = 'No deadline';
          if (p.due_date) {
            const parts = p.due_date.split('-');
            if (parts.length === 3) {
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              friendlyDue = `${monthNames[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}`;
            }
          }
          const user = TaskFlowAPI.getUser();
          const isMy = p.owner && user && p.owner.id === user.id;

          return {
            id: p.id,
            name: p.name,
            description: p.description,
            color: p.color || 'blue',
            icon: p.icon || 'window',
            status: p.status || 'Active',
            progress: p.progress || 0,
            completedTasks: p.completed_tasks || 0,
            totalTasks: p.total_tasks || 0,
            teamMembers: p.team_members && p.team_members.length ? p.team_members.map(m => m.initials) : ['TF'],
            teamDepartment: p.department || 'General',
            dueDate: friendlyDue,
            dueDateRaw: p.due_date || '',
            startDateRaw: p.start_date || '',
            lastUpdated: 'Recently',
            lastUpdatedTimestamp: Date.now(),
            category: isMy ? 'my' : 'shared',
            isArchived: Boolean(p.is_archived),
            rawMembers: p.team_members || []
          };
        });
      }
    } catch (err) {
      console.warn('Could not fetch projects from API:', err);
    }
    render();
  }

  /**
   * Helper: Format count with leading zero
   */
  function formatCount(num) {
    return num < 10 ? `0${num}` : `${num}`;
  }

  /**
   * Update Summary Metrics and sidebar badge
   */
  function updateSummaryCounts() {
    const activeNonArchived = projects.filter(p => !p.isArchived);
    const totalCount = activeNonArchived.length;
    const activeCount = activeNonArchived.filter(p => p.status === 'Active').length;
    const completedCount = activeNonArchived.filter(p => p.status === 'Completed').length;
    const atRiskCount = activeNonArchived.filter(p => p.status === 'At Risk').length;

    if (elements.countTotalProjects) elements.countTotalProjects.textContent = formatCount(totalCount);
    if (elements.countActiveProjects) elements.countActiveProjects.textContent = formatCount(activeCount);
    if (elements.countCompletedProjects) elements.countCompletedProjects.textContent = formatCount(completedCount);
    if (elements.countAtRiskProjects) elements.countAtRiskProjects.textContent = formatCount(atRiskCount);

    if (elements.sidebarProjectsBadge) {
      elements.sidebarProjectsBadge.textContent = totalCount;
    }
  }

  /**
   * Filter and Sort projects based on current controls
   */
  function getFilteredProjects() {
    const searchQuery = (elements.projectSearchFilterInput?.value || '').trim().toLowerCase();
    const selectedStatus = elements.statusFilterSelect?.value || 'all';
    const selectedTeam = elements.teamFilterSelect?.value || 'all';
    const sortOrder = elements.sortControlSelect?.value || 'recent';

    return projects.filter(project => {
      // 1. Tab filter
      if (currentTab === 'archived') {
        if (!project.isArchived) return false;
      } else {
        if (project.isArchived) return false;

        if (currentTab === 'my' && project.category !== 'my') {
          return false;
        }
        if (currentTab === 'shared' && project.category !== 'shared') {
          return false;
        }
      }

      // 2. Summary Card filter
      if (cardStatusFilter !== 'all' && project.status !== cardStatusFilter) {
        return false;
      }

      // 3. Search filter (name, description, team)
      if (searchQuery) {
        const matchesName = project.name.toLowerCase().includes(searchQuery);
        const matchesDesc = (project.description || '').toLowerCase().includes(searchQuery);
        const matchesTeam = (project.teamDepartment || '').toLowerCase().includes(searchQuery);
        if (!matchesName && !matchesDesc && !matchesTeam) return false;
      }

      // 4. Status filter from dropdown
      if (selectedStatus !== 'all' && project.status !== selectedStatus) {
        return false;
      }

      // 5. Team filter from dropdown
      if (selectedTeam !== 'all' && project.teamDepartment !== selectedTeam) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortOrder === 'due') {
        return (a.dueDateRaw || '').localeCompare(b.dueDateRaw || '');
      }
      if (sortOrder === 'progress') {
        return b.progress - a.progress;
      }
      // 'recent'
      return (b.lastUpdatedTimestamp || 0) - (a.lastUpdatedTimestamp || 0);
    });
  }

  /**
   * Render Main Projects Workspace (Grid or List)
   */
  function render() {
    updateSummaryCounts();
    const visibleProjects = getFilteredProjects();

    if (visibleProjects.length === 0) {
      if (elements.projectsGridWrapper) elements.projectsGridWrapper.style.display = 'none';
      if (elements.projectsTableWrapper) elements.projectsTableWrapper.style.display = 'none';
      if (elements.emptyStateContainer) elements.emptyStateContainer.style.display = 'flex';
      return;
    }

    if (elements.emptyStateContainer) {
      elements.emptyStateContainer.style.display = 'none';
    }

    if (currentView === 'grid') {
      if (elements.projectsGridWrapper) elements.projectsGridWrapper.style.display = 'block';
      if (elements.projectsTableWrapper) elements.projectsTableWrapper.style.display = 'none';
      renderGrid(visibleProjects);
    } else {
      if (elements.projectsGridWrapper) elements.projectsGridWrapper.style.display = 'none';
      if (elements.projectsTableWrapper) elements.projectsTableWrapper.style.display = 'block';
      renderList(visibleProjects);
    }
  }

  /**
   * Helper: Get SVG icon HTML for project
   */
  function getProjectIconSvg(iconType) {
    switch (iconType) {
      case 'mobile':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`;
      case 'megaphone':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-5v12L3 13v-2z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>`;
      case 'layers':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`;
      case 'code':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
      case 'user-check':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>`;
      case 'window':
      default:
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
    }
  }

  /**
   * Helper: Get avatar bubble background classes
   */
  function getAvatarClass(initial) {
    if (initial === 'AJ') return 'av-blue';
    if (initial === 'SK') return 'av-purple';
    if (initial === 'ML') return 'av-green';
    return 'av-amber';
  }

  /**
   * Render Projects Grid View
   */
  function renderGrid(visibleProjects) {
    if (!elements.projectsCardsGrid) return;
    elements.projectsCardsGrid.innerHTML = '';

    visibleProjects.forEach(project => {
      const card = document.createElement('div');
      card.className = 'project-card';
      card.dataset.projectId = project.id;

      // Status pill class
      let statusClass = 'status-active';
      if (project.status === 'Planning') statusClass = 'status-planning';
      if (project.status === 'Completed') statusClass = 'status-completed';
      if (project.status === 'At Risk') statusClass = 'status-at-risk';

      // Bar class & icon background
      const colorClass = project.color || 'blue';

      // Team avatars HTML
      const avatarsHtml = (project.teamMembers || ['AJ', 'SK', 'ML']).map(initial => `
        <span class="avatar-bubble ${getAvatarClass(initial)}" title="Team member ${initial}">${initial}</span>
      `).join('');

      card.innerHTML = `
        <div>
          <!-- Top Row -->
          <div class="card-top-row">
            <div class="project-badge-icon badge-icon-${colorClass}">
              ${getProjectIconSvg(project.icon)}
            </div>
            <div class="card-top-right">
              <span class="status-pill ${statusClass}">${escapeHtml(project.status)}</span>
              <button class="card-menu-btn" aria-label="Project actions" aria-haspopup="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="12" cy="5" r="1"></circle>
                  <circle cx="12" cy="19" r="1"></circle>
                </svg>
              </button>
            </div>
          </div>

          <!-- 3-Dot Dropdown Menu -->
          <div class="card-dropdown-menu" role="menu">
            <button class="card-menu-item action-open-project" role="menuitem">Open Project</button>
            <button class="card-menu-item action-edit-project" role="menuitem">Edit Project</button>
            <button class="card-menu-item action-manage-members" role="menuitem">Manage Members</button>
            <button class="card-menu-item action-archive-project" role="menuitem">${project.isArchived ? 'Unarchive' : 'Archive Project'}</button>
            <button class="card-menu-item danger-item action-delete-project" role="menuitem">Delete Project</button>
          </div>

          <!-- Body -->
          <div class="card-body">
            <h3 class="project-card-title">${escapeHtml(project.name)}</h3>
            <p class="project-card-desc">${escapeHtml(project.description)}</p>
          </div>
        </div>

        <div>
          <!-- Progress -->
          <div class="card-progress-wrap">
            <div class="progress-labels-row">
              <span class="progress-meta-text">${project.completedTasks} of ${project.totalTasks} tasks completed</span>
              <span class="progress-pct-val">${project.progress}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill bar-${colorClass}" style="width: ${project.progress}%;"></div>
            </div>
          </div>

          <!-- Footer -->
          <div class="card-footer-row">
            <div class="team-avatars-cluster">
              ${avatarsHtml}
            </div>
            <div class="due-date-cluster ${project.status === 'At Risk' ? 'is-overdue' : ''}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>${escapeHtml(project.dueDate)}</span>
            </div>
          </div>
        </div>
      `;

      // Event: Clicking card opens board view / details
      card.addEventListener('click', (e) => {
        // Prevent if clicking menu
        if (e.target.closest('.card-menu-btn') || e.target.closest('.card-dropdown-menu')) return;
        window.location.href = `project-details.html?id=${project.id}`;
      });

      // Event: Toggle 3-dot menu
      const menuBtn = card.querySelector('.card-menu-btn');
      const menuDropdown = card.querySelector('.card-dropdown-menu');

      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardMenus();
        menuDropdown.classList.toggle('active');
      });

      // Actions
      card.querySelector('.action-open-project').addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardMenus();
        window.location.href = `project-details.html?id=${project.id}`;
      });

      card.querySelector('.action-edit-project').addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardMenus();
        openEditProjectModal(project.id);
      });

      card.querySelector('.action-manage-members').addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardMenus();
        openMembersModal(project.id);
      });

      card.querySelector('.action-archive-project').addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardMenus();
        openArchiveModal(project.id);
      });

      card.querySelector('.action-delete-project').addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardMenus();
        openDeleteModal(project.id);
      });

      elements.projectsCardsGrid.appendChild(card);
    });
  }

  /**
   * Render Projects List View (Table)
   */
  function renderList(visibleProjects) {
    if (!elements.projectsTableBody) return;
    elements.projectsTableBody.innerHTML = '';

    visibleProjects.forEach(project => {
      const tr = document.createElement('tr');
      tr.className = 'project-table-row';
      tr.dataset.projectId = project.id;

      let statusClass = 'status-active';
      if (project.status === 'Planning') statusClass = 'status-planning';
      if (project.status === 'Completed') statusClass = 'status-completed';
      if (project.status === 'At Risk') statusClass = 'status-at-risk';

      const colorClass = project.color || 'blue';

      const avatarsHtml = (project.teamMembers || ['AJ', 'SK', 'ML']).map(initial => `
        <span class="avatar-bubble ${getAvatarClass(initial)}" title="Team member ${initial}">${initial}</span>
      `).join('');

      tr.innerHTML = `
        <td>
          <div class="table-project-cell">
            <div class="table-project-icon badge-icon-${colorClass}">
              ${getProjectIconSvg(project.icon)}
            </div>
            <div class="table-project-meta">
              <span class="table-project-title">${escapeHtml(project.name)}</span>
              <span class="table-project-sub">${escapeHtml(project.teamDepartment || 'General')} • ${project.completedTasks}/${project.totalTasks} tasks</span>
            </div>
          </div>
        </td>
        <td>
          <span class="status-pill ${statusClass}">${escapeHtml(project.status)}</span>
        </td>
        <td>
          <div class="table-progress-cell">
            <div class="table-progress-label">
              <span>${project.progress}%</span>
            </div>
            <div class="progress-track" style="width: 140px;">
              <div class="progress-fill bar-${colorClass}" style="width: ${project.progress}%;"></div>
            </div>
          </div>
        </td>
        <td>
          <div class="team-avatars-cluster">
            ${avatarsHtml}
          </div>
        </td>
        <td>
          <div class="due-date-cluster ${project.status === 'At Risk' ? 'is-overdue' : ''}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>${escapeHtml(project.dueDate)}</span>
          </div>
        </td>
        <td>
          <span style="font-size: 0.8125rem; color: #64748B;">${escapeHtml(project.lastUpdated)}</span>
        </td>
        <td style="text-align: center; position: relative;">
          <button class="card-menu-btn" aria-label="Project actions" aria-haspopup="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
          <div class="card-dropdown-menu" role="menu">
            <button class="card-menu-item action-open-project" role="menuitem">Open Project</button>
            <button class="card-menu-item action-edit-project" role="menuitem">Edit Project</button>
            <button class="card-menu-item action-manage-members" role="menuitem">Manage Members</button>
            <button class="card-menu-item action-archive-project" role="menuitem">${project.isArchived ? 'Unarchive' : 'Archive Project'}</button>
            <button class="card-menu-item danger-item action-delete-project" role="menuitem">Delete Project</button>
          </div>
        </td>
      `;

      // Event: Click table row title
      tr.querySelector('.table-project-cell').addEventListener('click', () => {
        window.location.href = `project-details.html?id=${project.id}`;
      });

      // Event: Toggle menu
      const menuBtn = tr.querySelector('.card-menu-btn');
      const menuDropdown = tr.querySelector('.card-dropdown-menu');

      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardMenus();
        menuDropdown.classList.toggle('active');
      });

      // Actions
      tr.querySelector('.action-open-project').addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardMenus();
        window.location.href = `project-details.html?id=${project.id}`;
      });

      tr.querySelector('.action-edit-project').addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardMenus();
        openEditProjectModal(project.id);
      });

      tr.querySelector('.action-manage-members').addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardMenus();
        openMembersModal(project.id);
      });

      tr.querySelector('.action-archive-project').addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardMenus();
        openArchiveModal(project.id);
      });

      tr.querySelector('.action-delete-project').addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardMenus();
        openDeleteModal(project.id);
      });

      elements.projectsTableBody.appendChild(tr);
    });
  }

  /**
   * Close all active card dropdown menus
   */
  function closeAllCardMenus() {
    document.querySelectorAll('.card-dropdown-menu.active').forEach(m => m.classList.remove('active'));
  }

  /**
   * Initialize Summary Cards Filtering
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
   * Initialize Navigation Tabs
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
    elements.projectSearchFilterInput?.addEventListener('input', () => {
      render();
    });

    elements.statusFilterSelect?.addEventListener('change', () => {
      render();
    });

    elements.teamFilterSelect?.addEventListener('change', () => {
      render();
    });

    elements.sortControlSelect?.addEventListener('change', () => {
      render();
    });

    // Quick filter button toggles focus on search
    elements.quickFilterBtn?.addEventListener('click', () => {
      elements.projectSearchFilterInput?.focus();
      showToast('Quick filter activated. Type to search or select filters.');
    });
  }

  /**
   * Initialize View Toggles (Grid View vs List View)
   */
  function initViewToggles() {
    const setView = (view) => {
      currentView = view;

      const isGrid = view === 'grid';
      elements.gridViewToggleBtn?.classList.toggle('active', isGrid);
      elements.gridViewToggleBtn?.setAttribute('aria-checked', String(isGrid));
      elements.listViewToggleBtn?.classList.toggle('active', !isGrid);
      elements.listViewToggleBtn?.setAttribute('aria-checked', String(!isGrid));

      elements.headerGridViewBtn?.classList.toggle('active', isGrid);
      elements.headerGridViewBtn?.setAttribute('aria-checked', String(isGrid));
      elements.headerListViewBtn?.classList.toggle('active', !isGrid);
      elements.headerListViewBtn?.setAttribute('aria-checked', String(!isGrid));

      render();
    };

    elements.gridViewToggleBtn?.addEventListener('click', () => setView('grid'));
    elements.listViewToggleBtn?.addEventListener('click', () => setView('list'));
    elements.headerGridViewBtn?.addEventListener('click', () => setView('grid'));
    elements.headerListViewBtn?.addEventListener('click', () => setView('list'));
  }

  /**
   * Open Create Project Modal
   */
  function openCreateProjectModal() {
    if (!elements.projectModal) return;

    elements.projectFormId.value = '';
    elements.modalProjectHeading.textContent = 'Create New Project';
    elements.modalProjectSubheading.textContent = 'Bring your team together around a shared goal.';
    elements.saveProjectModalBtn.textContent = 'Create Project';

    elements.projectNameInput.value = '';
    elements.projectDescInput.value = '';
    elements.projectStatusSelect.value = 'Active';
    elements.projectTeamSelect.value = 'Product';
    elements.projectStartDateInput.value = '2026-10-11';
    elements.projectDueDateInput.value = '2026-11-15';
    elements.projectMembersSelect.value = 'Core Team (AJ, SK, ML)';

    // Reset color to blue
    const blueRadio = document.querySelector('input[name="projectColor"][value="blue"]');
    if (blueRadio) blueRadio.checked = true;

    elements.projectModal.classList.add('open');
    elements.projectModal.setAttribute('aria-hidden', 'false');
    elements.projectNameInput.focus();
  }

  /**
   * Open Edit Project Modal
   */
  function openEditProjectModal(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    elements.projectFormId.value = project.id;
    elements.modalProjectHeading.textContent = 'Edit Project';
    elements.modalProjectSubheading.textContent = 'Update project parameters, timelines, and status.';
    elements.saveProjectModalBtn.textContent = 'Save Changes';

    elements.projectNameInput.value = project.name;
    elements.projectDescInput.value = project.description || '';
    elements.projectStatusSelect.value = project.status;
    elements.projectTeamSelect.value = project.teamDepartment || 'Product';
    elements.projectStartDateInput.value = project.startDateRaw || '2026-10-01';
    elements.projectDueDateInput.value = project.dueDateRaw || '2026-11-15';

    // Select color radio
    const colorRadio = document.querySelector(`input[name="projectColor"][value="${project.color || 'blue'}"]`);
    if (colorRadio) colorRadio.checked = true;

    elements.projectModal.classList.add('open');
    elements.projectModal.setAttribute('aria-hidden', 'false');
    elements.projectNameInput.focus();
  }

  function closeProjectModal() {
    if (!elements.projectModal) return;
    elements.projectModal.classList.remove('open');
    elements.projectModal.setAttribute('aria-hidden', 'true');
    elements.projectForm.reset();
  }

  /**
   * Handle Create / Edit Project Form Submit
   */
  async function handleProjectFormSubmit(e) {
    e.preventDefault();

    const name = elements.projectNameInput.value.trim();
    if (!name) {
      alert('Project name is required.');
      return;
    }

    const startDate = elements.projectStartDateInput.value;
    const dueDate = elements.projectDueDateInput.value;

    if (startDate && dueDate && dueDate < startDate) {
      alert('Due date must not be earlier than the start date.');
      return;
    }

    const editId = elements.projectFormId.value;
    const description = elements.projectDescInput.value.trim();
    const status = elements.projectStatusSelect.value;
    const teamDepartment = elements.projectTeamSelect.value;
    const color = document.querySelector('input[name="projectColor"]:checked')?.value || 'blue';

    const saveBtn = elements.saveProjectModalBtn;
    saveBtn.disabled = true;
    const origText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';

    try {
      if (editId && !String(editId).startsWith('proj-')) {
        await TaskFlowAPI.updateProject(editId, {
          name,
          description,
          status,
          department: teamDepartment,
          color,
          start_date: startDate || null,
          due_date: dueDate || null
        });
        showToast(`Project "${name}" updated successfully.`);
      } else {
        await TaskFlowAPI.createProject({
          name,
          description,
          status,
          department: teamDepartment,
          color,
          start_date: startDate || null,
          due_date: dueDate || null
        });
        showToast(`Project "${name}" created successfully.`);
      }
      closeProjectModal();
      await fetchProjectsFromAPI();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = origText;
    }
  }

  /**
   * Open Members Modal
   */
  async function openMembersModal(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    activeActionProjectId = projectId;
    if (elements.membersProjectSubtitle) {
      elements.membersProjectSubtitle.textContent = project.name;
    }

    if (elements.membersListWrapper) {
      elements.membersListWrapper.innerHTML = '';
      try {
        const members = await TaskFlowAPI.getProjectMembers(projectId);
        if (members && members.length) {
          members.forEach(m => {
            const u = m.user || {};
            const row = document.createElement('div');
            row.className = 'member-row-item';
            row.innerHTML = `
              <div class="member-avatar av-blue">${escapeHtml(u.initials || 'TF')}</div>
              <div class="member-info">
                <span class="member-name">${escapeHtml(u.full_name || u.email)}</span>
                <span class="member-email">${escapeHtml(u.email)}</span>
              </div>
              <span class="member-role-badge">${escapeHtml(m.role || 'Member')}</span>
            `;
            elements.membersListWrapper.appendChild(row);
          });
        }
      } catch (err) {
        console.warn('Error loading members:', err);
      }
    }

    elements.membersModal.classList.add('open');
    elements.membersModal.setAttribute('aria-hidden', 'false');
  }

  function closeMembersModal() {
    if (!elements.membersModal) return;
    elements.membersModal.classList.remove('open');
    elements.membersModal.setAttribute('aria-hidden', 'true');
    activeActionProjectId = null;
  }

  /**
   * Open Delete Confirmation Modal
   */
  function openDeleteModal(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    activeActionProjectId = projectId;
    if (elements.deleteProjectTargetName) {
      elements.deleteProjectTargetName.textContent = `"${project.name}"`;
    }

    elements.deleteProjectModal.classList.add('open');
    elements.deleteProjectModal.setAttribute('aria-hidden', 'false');
  }

  function closeDeleteModal() {
    if (!elements.deleteProjectModal) return;
    elements.deleteProjectModal.classList.remove('open');
    elements.deleteProjectModal.setAttribute('aria-hidden', 'true');
    activeActionProjectId = null;
  }

  /**
   * Open Archive Confirmation Modal
   */
  function openArchiveModal(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    activeActionProjectId = projectId;
    if (elements.archiveProjectTargetName) {
      elements.archiveProjectTargetName.textContent = `"${project.name}"`;
    }

    elements.archiveProjectModal.classList.add('open');
    elements.archiveProjectModal.setAttribute('aria-hidden', 'false');
  }

  function closeArchiveModal() {
    if (!elements.archiveProjectModal) return;
    elements.archiveProjectModal.classList.remove('open');
    elements.archiveProjectModal.setAttribute('aria-hidden', 'true');
    activeActionProjectId = null;
  }

  /**
   * Initialize Modals
   */
  function initModals() {
    // Open project modal triggers
    elements.newProjectHeaderBtn?.addEventListener('click', openCreateProjectModal);
    elements.emptyCreateProjectBtn?.addEventListener('click', openCreateProjectModal);
    elements.actionCreateProject?.addEventListener('click', () => {
      closeAllDropdowns();
      openCreateProjectModal();
    });
    elements.sidebarAddProjectBtn?.addEventListener('click', openCreateProjectModal);

    // Form submit
    elements.projectForm?.addEventListener('submit', handleProjectFormSubmit);

    // Close project modal
    elements.closeProjectModalBtn?.addEventListener('click', closeProjectModal);
    elements.cancelProjectModalBtn?.addEventListener('click', closeProjectModal);
    elements.projectModal?.addEventListener('click', (e) => {
      if (e.target === elements.projectModal) closeProjectModal();
    });

    // Members Modal Actions
    elements.closeMembersModalBtn?.addEventListener('click', closeMembersModal);
    elements.closeMembersDoneBtn?.addEventListener('click', closeMembersModal);
    elements.membersModal?.addEventListener('click', (e) => {
      if (e.target === elements.membersModal) closeMembersModal();
    });

    elements.inviteMemberBtn?.addEventListener('click', async () => {
      const email = elements.inviteMemberInput?.value.trim();
      if (!email) {
        alert('Please enter a valid email address.');
        return;
      }
      if (activeActionProjectId) {
        try {
          await TaskFlowAPI.addProjectMember(activeActionProjectId, {
            email,
            role: 'member'
          });
          showToast(`Invited ${email} to project.`);
          elements.inviteMemberInput.value = '';
          await fetchProjectsFromAPI();
          openMembersModal(activeActionProjectId);
        } catch (err) {
          showToast(`Error adding member: ${err.message}`);
        }
      }
    });

    // Delete Modal Actions
    elements.closeDeleteModalBtn?.addEventListener('click', closeDeleteModal);
    elements.cancelDeleteProjectBtn?.addEventListener('click', closeDeleteModal);
    elements.deleteProjectModal?.addEventListener('click', (e) => {
      if (e.target === elements.deleteProjectModal) closeDeleteModal();
    });

    elements.confirmDeleteProjectBtn?.addEventListener('click', async () => {
      if (activeActionProjectId) {
        try {
          await TaskFlowAPI.deleteProject(activeActionProjectId);
          showToast('Project deleted successfully.');
          closeDeleteModal();
          await fetchProjectsFromAPI();
        } catch (err) {
          showToast(`Error deleting project: ${err.message}`);
          closeDeleteModal();
        }
      }
    });

    // Archive Modal Actions
    elements.closeArchiveModalBtn?.addEventListener('click', closeArchiveModal);
    elements.cancelArchiveProjectBtn?.addEventListener('click', closeArchiveModal);
    elements.archiveProjectModal?.addEventListener('click', (e) => {
      if (e.target === elements.archiveProjectModal) closeArchiveModal();
    });

    elements.confirmArchiveProjectBtn?.addEventListener('click', async () => {
      if (activeActionProjectId) {
        const project = projects.find(p => p.id === activeActionProjectId);
        if (project) {
          try {
            await TaskFlowAPI.updateProject(activeActionProjectId, {
              is_archived: !project.isArchived
            });
            showToast(`Project "${project.name}" ${project.isArchived ? 'unarchived' : 'archived'} successfully.`);
            closeArchiveModal();
            await fetchProjectsFromAPI();
          } catch (err) {
            showToast(`Error: ${err.message}`);
            closeArchiveModal();
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

      const matches = [];
      projects.forEach(p => {
        if (p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.teamDepartment || '').toLowerCase().includes(q)) {
          matches.push({ title: p.name, subtitle: `Project • ${p.status}`, projectId: p.id });
        }
      });

      // Quick task mock links
      ['Finalize homepage wireframes', 'Review API documentation', 'Prepare campaign assets'].forEach(t => {
        if (t.toLowerCase().includes(q)) {
          matches.push({ title: t, subtitle: 'Task item' });
        }
      });

      if (matches.length === 0) {
        resultsList.innerHTML = `<div style="padding: 12px; font-size: 0.8125rem; color: #64748B; text-align: center;">No matching projects found.</div>`;
      } else {
        resultsList.innerHTML = matches.slice(0, 5).map(m => `
          <div class="search-result-item" data-project-id="${m.projectId || ''}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
            <div>
              <div style="font-weight: 600; color: #0F172A;">${escapeHtml(m.title)}</div>
              <div style="font-size: 0.6875rem; color: #64748B;">${escapeHtml(m.subtitle)}</div>
            </div>
          </div>
        `).join('');

        resultsList.querySelectorAll('.search-result-item').forEach(item => {
          item.addEventListener('click', () => {
            const pId = item.dataset.projectId;
            resultsDropdown.classList.remove('active');
            searchInput.value = '';

            if (pId) {
              const targetProj = projects.find(p => p.id === pId);
              if (targetProj) {
                if (elements.projectSearchFilterInput) {
                  elements.projectSearchFilterInput.value = targetProj.name;
                  render();
                }
                showToast(`Filtered view to "${targetProj.name}"`);
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
          closeAllCardMenus();
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
        closeAllCardMenus();
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

    // Create Workspace option
    document.getElementById('createWorkspaceOption')?.addEventListener('click', () => {
      closeAllDropdowns();
      const name = prompt('Enter new workspace name:');
      if (name) {
        showToast(`Workspace "${name}" created.`);
      }
    });

    // Create Task option in Create New
    document.getElementById('actionCreateTask')?.addEventListener('click', () => {
      closeAllDropdowns();
      window.location.href = 'my-tasks.html';
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
        if (elements.projectSearchFilterInput) {
          elements.projectSearchFilterInput.value = proj;
          render();
          showToast(`Filtered projects to "${proj}"`);
        }
      });
    });

    // Settings & Help bottom buttons
    document.getElementById('sidebarSettingsBtn')?.addEventListener('click', () => {
      showToast('Opening Workspace Settings.');
    });
    document.getElementById('sidebarHelpBtn')?.addEventListener('click', () => {
      showToast('Opening Help & Support documentation.');
    });

    // Help menu options
    document.getElementById('helpDocsOption')?.addEventListener('click', (e) => {
      e.preventDefault();
      closeAllDropdowns();
      alert('TaskFlow Documentation opening soon.');
    });
    document.getElementById('helpShortcutsOption')?.addEventListener('click', (e) => {
      e.preventDefault();
      closeAllDropdowns();
      alert('Keyboard Shortcuts: Ctrl+K to Search, Esc to close modals.');
    });
    document.getElementById('helpContactOption')?.addEventListener('click', (e) => {
      e.preventDefault();
      closeAllDropdowns();
      alert('Support team reachable at support@taskflow.app');
    });

    // Profile menu items
    document.getElementById('menuMyProfile')?.addEventListener('click', () => {
      closeAllDropdowns();
      showToast('Navigating to user profile.');
    });
    document.getElementById('menuAccountSettings')?.addEventListener('click', () => {
      closeAllDropdowns();
      showToast('Opening account settings.');
    });
    document.getElementById('menuLogOut')?.addEventListener('click', () => {
      closeAllDropdowns();
      if (confirm('Are you sure you want to log out of TaskFlow?')) {
        window.location.href = 'login.html';
      }
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

    // Document click closes dropdowns and row menus
    document.addEventListener('click', () => {
      closeAllDropdowns();
      closeAllCardMenus();
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
        closeAllCardMenus();
        closeProjectModal();
        closeMembersModal();
        closeDeleteModal();
        closeArchiveModal();
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

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

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
