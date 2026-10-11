/**
 * TaskFlow — Interface 13: Team Members Page
 * Script: team-members.js
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. Initial State & Data Seeding
  // =========================================================================

  const STORAGE_KEY_MEMBERS = 'taskflow_team_members';
  const STORAGE_KEY_USER_PROFILE = 'taskflow_user_profile';
  const STORAGE_KEY_WORKSPACE = 'taskflow_current_workspace';

  // Retrieve current user profile (synced with previous interfaces)
  let currentUserProfile = {
    name: 'Your Name',
    role: 'Product Lead',
    email: 'your.name@workspace.com',
    initials: 'YB'
  };

  try {
    const savedProfile = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
    if (savedProfile) {
      currentUserProfile = Object.assign(currentUserProfile, JSON.parse(savedProfile));
    }
  } catch (e) {
    console.warn('Failed to parse user profile from localStorage', e);
  }

  const defaultMembers = [];
  let members = [];

  function saveMembers() {
    try {
      localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
    } catch (e) {
      console.error('Storage write error', e);
    }
  }

  // Directory View State
  let currentView = 'list'; // 'list' or 'grid'
  let searchQuery = '';
  let selectedRole = 'All';
  let selectedStatus = 'All';
  let selectedProject = 'All';
  let sortOrder = 'name-asc';
  let currentPage = 1;
  const pageSize = 8;

  // Selected member for modal actions
  let activeMemberId = null;

  // =========================================================================
  // 2. DOM Elements
  // =========================================================================

  // Metrics
  const statTotalMembers = document.getElementById('statTotalMembers');
  const statActiveMembers = document.getElementById('statActiveMembers');
  const statPendingInvitations = document.getElementById('statPendingInvitations');
  const statProjectLeads = document.getElementById('statProjectLeads');
  const directoryCountBadge = document.getElementById('directoryCountBadge');

  // Directory Controls
  const memberSearchInput = document.getElementById('memberSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const roleFilterSelect = document.getElementById('roleFilterSelect');
  const statusFilterSelect = document.getElementById('statusFilterSelect');
  const projectFilterSelect = document.getElementById('projectFilterSelect');
  const sortOrderSelect = document.getElementById('sortOrderSelect');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const listViewBtn = document.getElementById('listViewBtn');
  const gridViewBtn = document.getElementById('gridViewBtn');

  // Containers
  const tableViewContainer = document.getElementById('tableViewContainer');
  const gridViewContainer = document.getElementById('gridViewContainer');
  const teamTableBody = document.getElementById('teamTableBody');
  const memberCardsGrid = document.getElementById('memberCardsGrid');
  const emptyResultsBox = document.getElementById('emptyResultsBox');
  const emptyActionBtn = document.getElementById('emptyActionBtn');

  // Pagination
  const paginationBar = document.getElementById('paginationBar');
  const pageStart = document.getElementById('pageStart');
  const pageEnd = document.getElementById('pageEnd');
  const pageTotal = document.getElementById('pageTotal');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const pageNumbersGroup = document.getElementById('pageNumbersGroup');

  // Modals & Drawers
  const inviteModalBackdrop = document.getElementById('inviteModalBackdrop');
  const openInviteModalBtn = document.getElementById('openInviteModalBtn');
  const closeInviteModalBtn = document.getElementById('closeInviteModalBtn');
  const cancelInviteBtn = document.getElementById('cancelInviteBtn');
  const inviteForm = document.getElementById('inviteForm');
  const chipsInputContainer = document.getElementById('chipsInputContainer');
  const inviteEmailInput = document.getElementById('inviteEmailInput');
  const inviteRoleSelect = document.getElementById('inviteRoleSelect');
  const roleHelpText = document.getElementById('roleHelpText');
  const inviteMessageInput = document.getElementById('inviteMessageInput');
  const sendInviteSubmitBtn = document.getElementById('sendInviteSubmitBtn');

  // Profile Slide-over Drawer
  const memberDrawerBackdrop = document.getElementById('memberDrawerBackdrop');
  const memberProfileDrawer = document.getElementById('memberProfileDrawer');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const drawerContentBody = document.getElementById('drawerContentBody');
  const drawerChangeRoleBtn = document.getElementById('drawerChangeRoleBtn');
  const drawerRemoveBtn = document.getElementById('drawerRemoveBtn');

  // Change Role Modal
  const changeRoleModalBackdrop = document.getElementById('changeRoleModalBackdrop');
  const changeRoleSelect = document.getElementById('changeRoleSelect');
  const cancelChangeRoleBtn = document.getElementById('cancelChangeRoleBtn');
  const confirmChangeRoleBtn = document.getElementById('confirmChangeRoleBtn');

  // Remove Member Modal
  const removeMemberModalBackdrop = document.getElementById('removeMemberModalBackdrop');
  const cancelRemoveMemberBtn = document.getElementById('cancelRemoveMemberBtn');
  const confirmRemoveMemberBtn = document.getElementById('confirmRemoveMemberBtn');
  const removeMemberDesc = document.getElementById('removeMemberDesc');

  // Cancel Invitation Modal
  const cancelInviteModalBackdrop = document.getElementById('cancelInviteModalBackdrop');
  const dismissCancelInviteBtn = document.getElementById('dismissCancelInviteBtn');
  const confirmCancelInviteBtn = document.getElementById('confirmCancelInviteBtn');

  // Export Button
  const exportBtn = document.getElementById('exportBtn');

  // Global Toast
  const toastContainer = document.getElementById('toastContainer');

  // =========================================================================
  // 3. User & Workspace Profile Sync
  // =========================================================================

  function renderUserProfileUI() {
    // Top Header User Profile (Right Side)
    const headerInitials = document.getElementById('headerAvatarInitials');
    const headerUserName = document.getElementById('headerUserName');
    const headerUserRole = document.getElementById('headerUserRole');
    if (headerInitials) headerInitials.textContent = currentUserProfile.initials;
    if (headerUserName) headerUserName.textContent = currentUserProfile.name;
    if (headerUserRole) headerUserRole.textContent = currentUserProfile.role;

    // Header Profile Dropdown Menu
    const headerMenuName = document.getElementById('headerMenuName');
    const headerMenuEmail = document.getElementById('headerMenuEmail');
    const headerMenuAvatar = document.getElementById('headerMenuAvatar');
    const headerMenuStatus = document.getElementById('headerMenuStatus');
    if (headerMenuName) headerMenuName.textContent = currentUserProfile.name;
    if (headerMenuEmail) headerMenuEmail.textContent = currentUserProfile.email;
    if (headerMenuAvatar) headerMenuAvatar.textContent = currentUserProfile.initials;
    if (headerMenuStatus) headerMenuStatus.textContent = `Active • ${currentUserProfile.role}`;

    // Sidebar Profile (Bottom Left)
    const sidebarAvatar = document.getElementById('sidebarAvatar') || document.getElementById('sidebarUserAvatar');
    const sidebarName = document.getElementById('sidebarUserName');
    const sidebarRole = document.getElementById('sidebarUserRole');
    if (sidebarAvatar) sidebarAvatar.textContent = currentUserProfile.initials;
    if (sidebarName) sidebarName.textContent = currentUserProfile.name;
    if (sidebarRole) sidebarRole.textContent = currentUserProfile.role;

    // Sidebar Profile Menu
    const profileMenuName = document.getElementById('profileMenuName') || document.getElementById('sidebarMenuName');
    const profileMenuEmail = document.getElementById('profileMenuEmail') || document.getElementById('sidebarMenuEmail');
    const profileMenuAvatar = document.getElementById('profileMenuAvatar') || document.getElementById('sidebarMenuAvatar');
    const profileMenuStatus = document.getElementById('profileMenuStatus') || document.getElementById('sidebarMenuStatus');
    if (profileMenuName) profileMenuName.textContent = currentUserProfile.name;
    if (profileMenuEmail) profileMenuEmail.textContent = currentUserProfile.email;
    if (profileMenuAvatar) profileMenuAvatar.textContent = currentUserProfile.initials;
    if (profileMenuStatus) profileMenuStatus.textContent = `Active • ${currentUserProfile.role}`;
  }

  renderUserProfileUI();

  // Synchronize Workspace Selection
  const currentWorkspaceName = document.getElementById('currentWorkspaceName');
  const currentWorkspaceAvatar = document.getElementById('currentWorkspaceAvatar');
  const savedWs = localStorage.getItem(STORAGE_KEY_WORKSPACE);
  if (savedWs && currentWorkspaceName && currentWorkspaceAvatar) {
    currentWorkspaceName.textContent = savedWs;
    currentWorkspaceAvatar.textContent = savedWs.charAt(0).toUpperCase();
  }

  // =========================================================================
  // 4. Metrics & Statistics Calculation
  // =========================================================================

  function updateSummaryMetrics() {
    const total = members.length;
    const active = members.filter(m => m.status === 'Active').length;
    const pending = members.filter(m => m.status === 'Pending Invitation').length;
    const leads = members.filter(m => m.role === 'Project Lead' || m.role === 'Admin').length;

    if (statTotalMembers) statTotalMembers.textContent = total;
    if (statActiveMembers) statActiveMembers.textContent = active;
    if (statPendingInvitations) statPendingInvitations.textContent = pending;
    if (statProjectLeads) statProjectLeads.textContent = leads;
    if (directoryCountBadge) directoryCountBadge.textContent = `${total} members`;
  }

  // =========================================================================
  // 5. Filtering, Sorting, and Directory Rendering
  // =========================================================================

  function getFilteredAndSortedMembers() {
    let list = [...members];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      );
    }

    // Role filter
    if (selectedRole !== 'All') {
      list = list.filter(m => m.role === selectedRole);
    }

    // Status filter
    if (selectedStatus !== 'All') {
      list = list.filter(m => m.status === selectedStatus);
    }

    // Project filter
    if (selectedProject !== 'All') {
      list = list.filter(m => m.projects && m.projects.includes(selectedProject));
    }

    // Sort order
    list.sort((a, b) => {
      switch (sortOrder) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'date-desc':
          return new Date(b.dateAdded) - new Date(a.dateAdded);
        case 'role-asc':
          return a.role.localeCompare(b.role);
        default:
          return 0;
      }
    });

    return list;
  }

  function getRoleBadgeClass(role) {
    switch (role) {
      case 'Admin': return 'role-admin';
      case 'Project Lead': return 'role-lead';
      case 'Designer': return 'role-designer';
      case 'Developer': return 'role-developer';
      case 'Member': default: return 'role-member';
    }
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'Active': return 'status-active';
      case 'Away': return 'status-away';
      case 'Pending Invitation': return 'status-pending';
      case 'Deactivated': return 'status-deactivated';
      default: return 'status-active';
    }
  }

  function renderDirectory() {
    const filtered = getFilteredAndSortedMembers();
    const totalCount = filtered.length;

    // Check if filters are active
    const hasActiveFilters = searchQuery.trim() !== '' ||
      selectedRole !== 'All' ||
      selectedStatus !== 'All' ||
      selectedProject !== 'All';

    if (clearFiltersBtn) {
      clearFiltersBtn.style.display = hasActiveFilters ? 'inline-flex' : 'none';
    }

    // Handle Empty States
    if (totalCount === 0) {
      if (tableViewContainer) tableViewContainer.style.display = 'none';
      if (gridViewContainer) gridViewContainer.style.display = 'none';
      if (paginationBar) paginationBar.style.display = 'none';
      if (emptyResultsBox) emptyResultsBox.style.display = 'flex';
      return;
    }

    if (emptyResultsBox) emptyResultsBox.style.display = 'none';
    if (paginationBar) paginationBar.style.display = 'flex';

    // Pagination calculations
    const totalPages = Math.ceil(totalCount / pageSize);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalCount);
    const pageItems = filtered.slice(startIndex, endIndex);

    // Update Pagination Bar
    if (pageStart) pageStart.textContent = startIndex + 1;
    if (pageEnd) pageEnd.textContent = endIndex;
    if (pageTotal) pageTotal.textContent = totalCount;
    if (prevPageBtn) prevPageBtn.disabled = (currentPage === 1);
    if (nextPageBtn) nextPageBtn.disabled = (currentPage === totalPages);

    renderPaginationPages(totalPages);

    // Render appropriate view
    if (currentView === 'list') {
      if (tableViewContainer) tableViewContainer.style.display = 'block';
      if (gridViewContainer) gridViewContainer.style.display = 'none';
      renderTableView(pageItems);
    } else {
      if (tableViewContainer) tableViewContainer.style.display = 'none';
      if (gridViewContainer) gridViewContainer.style.display = 'block';
      renderGridView(pageItems);
    }
  }

  function renderPaginationPages(totalPages) {
    if (!pageNumbersGroup) return;
    pageNumbersGroup.innerHTML = '';

    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn-page-number ${p === currentPage ? 'active' : ''}`;
      btn.textContent = p;
      btn.addEventListener('click', () => {
        currentPage = p;
        renderDirectory();
      });
      pageNumbersGroup.appendChild(btn);
    }
  }

  // Render Table View (Interface 13 List Table)
  function renderTableView(items) {
    if (!teamTableBody) return;
    teamTableBody.innerHTML = '';

    items.forEach(member => {
      const tr = document.createElement('tr');
      tr.dataset.memberId = member.id;

      // Projects markup
      let projectsHtml = '';
      if (member.projects && member.projects.length > 0) {
        const visibleProjects = member.projects.slice(0, 2);
        const remaining = member.projects.length - 2;

        projectsHtml = visibleProjects.map(proj =>
          `<span class="project-tag">${escapeHtml(proj)}</span>`
        ).join('');

        if (remaining > 0) {
          projectsHtml += `<span class="project-tag-more" title="${escapeHtml(member.projects.join(', '))}">+${remaining}</span>`;
        }
      } else {
        projectsHtml = '<span class="date-text">None</span>';
      }

      tr.innerHTML = `
        <!-- Member -->
        <td>
          <div class="member-cell">
            <div class="member-avatar" style="background-color: ${member.avatarColor};">
              ${escapeHtml(member.initials)}
            </div>
            <div class="member-info-col">
              <div class="member-name-row">
                <span class="member-name" data-action="view-profile" data-id="${member.id}">${escapeHtml(member.name)}</span>
                ${member.isCurrentUser ? '<span class="badge-you">You</span>' : ''}
              </div>
              <span class="member-email">${escapeHtml(member.email)}</span>
            </div>
          </div>
        </td>

        <!-- Role -->
        <td>
          <span class="role-badge ${getRoleBadgeClass(member.role)}">
            ${escapeHtml(member.role)}
          </span>
        </td>

        <!-- Projects -->
        <td>
          <div class="projects-badge-wrap">
            ${projectsHtml}
          </div>
        </td>

        <!-- Status -->
        <td>
          <span class="status-badge ${getStatusBadgeClass(member.status)}">
            <span class="status-dot"></span>
            ${escapeHtml(member.status)}
          </span>
        </td>

        <!-- Date Added -->
        <td>
          <span class="date-text">${escapeHtml(member.dateAddedFormatted || member.dateAdded)}</span>
        </td>

        <!-- Actions -->
        <td class="text-right">
          <div class="table-action-wrap">
            <button type="button" class="btn-icon-action action-menu-trigger" data-id="${member.id}" aria-label="Member actions">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            </button>
            <div class="dropdown-menu action-menu-dropdown" id="actionMenu-${member.id}" role="menu">
              <button class="dropdown-item" data-action="view-profile" data-id="${member.id}" role="menuitem">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>View Profile</span>
              </button>
              <button class="dropdown-item" data-action="view-projects" data-id="${member.id}" role="menuitem">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                <span>View Projects</span>
              </button>
              ${!member.isCurrentUser ? `
                <button class="dropdown-item" data-action="change-role" data-id="${member.id}" role="menuitem">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg>
                  <span>Change Role</span>
                </button>
                <div class="dropdown-divider"></div>
                ${member.status === 'Pending Invitation' ? `
                  <button class="dropdown-item item-danger" data-action="cancel-invite" data-id="${member.id}" role="menuitem">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                    <span>Cancel Invitation</span>
                  </button>
                ` : `
                  <button class="dropdown-item item-danger" data-action="remove-member" data-id="${member.id}" role="menuitem">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg>
                    <span>Remove from Project</span>
                  </button>
                `}
              ` : ''}
            </div>
          </div>
        </td>
      `;

      teamTableBody.appendChild(tr);
    });

    attachActionMenuListeners();
  }

  // Render Grid View (Interface 13 Alternative Card Grid)
  function renderGridView(items) {
    if (!memberCardsGrid) return;
    memberCardsGrid.innerHTML = '';

    items.forEach(member => {
      const card = document.createElement('div');
      card.className = 'member-card';
      card.dataset.memberId = member.id;

      let projectsHtml = '';
      if (member.projects && member.projects.length > 0) {
        projectsHtml = member.projects.map(p =>
          `<span class="project-tag">${escapeHtml(p)}</span>`
        ).join('');
      } else {
        projectsHtml = '<span class="date-text">None</span>';
      }

      card.innerHTML = `
        <div class="card-top-row">
          <div class="card-avatar-wrap">
            <div class="card-avatar" style="background-color: ${member.avatarColor};">
              ${escapeHtml(member.initials)}
            </div>
            <div class="card-meta-text">
              <span class="card-name" data-action="view-profile" data-id="${member.id}">
                ${escapeHtml(member.name)}
                ${member.isCurrentUser ? '<span class="badge-you" style="margin-left: 4px;">You</span>' : ''}
              </span>
              <span class="card-email">${escapeHtml(member.email)}</span>
            </div>
          </div>
          <div class="table-action-wrap">
            <button type="button" class="btn-icon-action action-menu-trigger" data-id="${member.id}" aria-label="Member actions">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            </button>
            <div class="dropdown-menu action-menu-dropdown" id="actionMenu-grid-${member.id}" role="menu">
              <button class="dropdown-item" data-action="view-profile" data-id="${member.id}" role="menuitem">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>View Profile</span>
              </button>
              <button class="dropdown-item" data-action="view-projects" data-id="${member.id}" role="menuitem">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                <span>View Projects</span>
              </button>
              ${!member.isCurrentUser ? `
                <button class="dropdown-item" data-action="change-role" data-id="${member.id}" role="menuitem">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg>
                  <span>Change Role</span>
                </button>
                <div class="dropdown-divider"></div>
                ${member.status === 'Pending Invitation' ? `
                  <button class="dropdown-item item-danger" data-action="cancel-invite" data-id="${member.id}" role="menuitem">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                    <span>Cancel Invitation</span>
                  </button>
                ` : `
                  <button class="dropdown-item item-danger" data-action="remove-member" data-id="${member.id}" role="menuitem">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg>
                    <span>Remove from Project</span>
                  </button>
                `}
              ` : ''}
            </div>
          </div>
        </div>

        <div class="card-badges-row">
          <span class="role-badge ${getRoleBadgeClass(member.role)}">${escapeHtml(member.role)}</span>
          <span class="status-badge ${getStatusBadgeClass(member.status)}">
            <span class="status-dot"></span>
            ${escapeHtml(member.status)}
          </span>
        </div>

        <div class="card-projects-section">
          <span class="card-section-label">Projects (${member.projects ? member.projects.length : 0})</span>
          <div class="projects-badge-wrap">
            ${projectsHtml}
          </div>
        </div>

        <div class="card-footer-row">
          <button type="button" class="btn-view-profile-link" data-action="view-profile" data-id="${member.id}">
            <span>View Profile</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
          <span class="card-joined-date">Added ${escapeHtml(member.dateAddedFormatted || member.dateAdded)}</span>
        </div>
      `;

      memberCardsGrid.appendChild(card);
    });

    attachActionMenuListeners();
  }

  // Action Menu Dropdown Handling
  function attachActionMenuListeners() {
    // Three-dot triggers
    document.querySelectorAll('.action-menu-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = btn.nextElementSibling;
        const isShown = menu.classList.contains('show');
        closeAllDropdowns();
        if (!isShown) {
          menu.classList.add('show');
        }
      });
    });

    // View profile click from name
    document.querySelectorAll('[data-action="view-profile"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns();
        openProfileDrawer(el.dataset.id);
      });
    });

    // View projects navigation
    document.querySelectorAll('[data-action="view-projects"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns();
        const m = members.find(item => item.id === el.dataset.id);
        if (m) {
          showToast(`Viewing projects for ${m.name}`, 'info');
          // Navigate to project-details or projects
          setTimeout(() => {
            window.location.href = 'projects.html';
          }, 800);
        }
      });
    });

    // Change role trigger
    document.querySelectorAll('[data-action="change-role"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns();
        openChangeRoleModal(el.dataset.id);
      });
    });

    // Remove member trigger
    document.querySelectorAll('[data-action="remove-member"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns();
        openRemoveMemberModal(el.dataset.id);
      });
    });

    // Cancel invite trigger
    document.querySelectorAll('[data-action="cancel-invite"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns();
        openCancelInviteModal(el.dataset.id);
      });
    });
  }

  // =========================================================================
  // 6. Member Profile Slide-Over Drawer
  // =========================================================================

  function openProfileDrawer(memberId) {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    activeMemberId = memberId;

    if (!drawerContentBody) return;

    let projectsMarkup = '';
    if (member.projects && member.projects.length > 0) {
      projectsMarkup = member.projects.map(p => `
        <div class="drawer-project-row">
          <span style="font-size: 0.86rem; font-weight: 600; color: #172B4D;">${escapeHtml(p)}</span>
          <span class="role-badge role-member">Collaborator</span>
        </div>
      `).join('');
    } else {
      projectsMarkup = '<div class="date-text">No active project assignments.</div>';
    }

    let activityMarkup = '';
    if (member.recentActivity && member.recentActivity.length > 0) {
      activityMarkup = member.recentActivity.map(act => `
        <div class="activity-item">
          <span class="activity-text">${escapeHtml(act.text)}</span>
          <span class="activity-time">${escapeHtml(act.time)}</span>
        </div>
      `).join('');
    } else {
      activityMarkup = '<div class="date-text">No recent collaboration activity recorded.</div>';
    }

    drawerContentBody.innerHTML = `
      <div class="drawer-hero-profile">
        <div class="drawer-avatar-lg" style="background-color: ${member.avatarColor};">
          ${escapeHtml(member.initials)}
        </div>
        <h3 class="drawer-name-lg">${escapeHtml(member.name)}</h3>
        <span class="drawer-email-lg">${escapeHtml(member.email)}</span>
        <div class="drawer-badges-lg">
          <span class="role-badge ${getRoleBadgeClass(member.role)}">${escapeHtml(member.role)}</span>
          <span class="status-badge ${getStatusBadgeClass(member.status)}">
            <span class="status-dot"></span>
            ${escapeHtml(member.status)}
          </span>
        </div>
      </div>

      <div class="drawer-meta-section">
        <span class="drawer-section-title">Membership Details</span>
        <div class="drawer-meta-grid">
          <div class="drawer-meta-col">
            <span class="drawer-meta-label">MEMBER SINCE</span>
            <span class="drawer-meta-val">${escapeHtml(member.dateAddedFormatted || member.dateAdded)}</span>
          </div>
          <div class="drawer-meta-col">
            <span class="drawer-meta-label">WORKSPACE PERMISSION</span>
            <span class="drawer-meta-val">${escapeHtml(member.role === 'Admin' ? 'Workspace Admin' : 'Project Member')}</span>
          </div>
        </div>
      </div>

      <div class="drawer-meta-section">
        <span class="drawer-section-title">Assigned Projects (${member.projects ? member.projects.length : 0})</span>
        <div class="drawer-projects-list">
          ${projectsMarkup}
        </div>
      </div>

      <div class="drawer-meta-section">
        <span class="drawer-section-title">Recent Activity</span>
        <div class="drawer-activity-timeline">
          ${activityMarkup}
        </div>
      </div>
    `;

    // Configure Drawer Footer buttons
    if (member.isCurrentUser) {
      if (drawerChangeRoleBtn) drawerChangeRoleBtn.style.display = 'none';
      if (drawerRemoveBtn) drawerRemoveBtn.style.display = 'none';
    } else {
      if (drawerChangeRoleBtn) drawerChangeRoleBtn.style.display = 'block';
      if (drawerRemoveBtn) {
        drawerRemoveBtn.style.display = 'block';
        if (member.status === 'Pending Invitation') {
          drawerRemoveBtn.textContent = 'Cancel Invitation';
        } else {
          drawerRemoveBtn.textContent = 'Remove from Project';
        }
      }
    }

    if (memberDrawerBackdrop) memberDrawerBackdrop.classList.add('show');
    if (memberProfileDrawer) {
      memberProfileDrawer.classList.add('open');
      memberProfileDrawer.setAttribute('aria-hidden', 'false');
    }
  }

  function closeProfileDrawer() {
    if (memberDrawerBackdrop) memberDrawerBackdrop.classList.remove('show');
    if (memberProfileDrawer) {
      memberProfileDrawer.classList.remove('open');
      memberProfileDrawer.setAttribute('aria-hidden', 'true');
    }
    activeMemberId = null;
  }

  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeProfileDrawer);
  if (memberDrawerBackdrop) memberDrawerBackdrop.addEventListener('click', closeProfileDrawer);

  if (drawerChangeRoleBtn) {
    drawerChangeRoleBtn.addEventListener('click', () => {
      if (activeMemberId) {
        const mId = activeMemberId;
        closeProfileDrawer();
        openChangeRoleModal(mId);
      }
    });
  }

  if (drawerRemoveBtn) {
    drawerRemoveBtn.addEventListener('click', () => {
      if (activeMemberId) {
        const m = members.find(item => item.id === activeMemberId);
        const mId = activeMemberId;
        closeProfileDrawer();
        if (m && m.status === 'Pending Invitation') {
          openCancelInviteModal(mId);
        } else {
          openRemoveMemberModal(mId);
        }
      }
    });
  }

  // =========================================================================
  // 7. Change Role Modal
  // =========================================================================

  function openChangeRoleModal(memberId) {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    activeMemberId = memberId;

    const changeRoleTitle = document.getElementById('changeRoleTitle');
    const changeRoleDesc = document.getElementById('changeRoleDesc');
    if (changeRoleTitle) changeRoleTitle.textContent = `Change Role for ${member.name}`;
    if (changeRoleDesc) changeRoleDesc.textContent = `Assign new access permissions in Website Redesign for ${member.email}.`;

    if (changeRoleSelect) {
      changeRoleSelect.value = member.role;
    }

    if (changeRoleModalBackdrop) changeRoleModalBackdrop.classList.add('show');
  }

  function closeChangeRoleModal() {
    if (changeRoleModalBackdrop) changeRoleModalBackdrop.classList.remove('show');
  }

  if (cancelChangeRoleBtn) cancelChangeRoleBtn.addEventListener('click', closeChangeRoleModal);

  if (confirmChangeRoleBtn) {
    confirmChangeRoleBtn.addEventListener('click', () => {
      if (!activeMemberId) return;
      const member = members.find(m => m.id === activeMemberId);
      if (member) {
        const newRole = changeRoleSelect ? changeRoleSelect.value : 'Member';
        member.role = newRole;
        saveMembers();
        updateSummaryMetrics();
        renderDirectory();
        showToast(`Updated ${member.name}'s role to ${newRole}`, 'success');
      }
      closeChangeRoleModal();
    });
  }

  // =========================================================================
  // 8. Remove Member Modal
  // =========================================================================

  function openRemoveMemberModal(memberId) {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    activeMemberId = memberId;

    const removeMemberTitle = document.getElementById('removeMemberTitle');
    if (removeMemberTitle) removeMemberTitle.textContent = `Remove ${member.name}?`;
    if (removeMemberDesc) {
      removeMemberDesc.textContent = `${member.name} (${member.email}) will lose access to Website Redesign tasks and assets. Their account will remain intact in any other workspace projects.`;
    }

    if (removeMemberModalBackdrop) removeMemberModalBackdrop.classList.add('show');
  }

  function closeRemoveMemberModal() {
    if (removeMemberModalBackdrop) removeMemberModalBackdrop.classList.remove('show');
  }

  if (cancelRemoveMemberBtn) cancelRemoveMemberBtn.addEventListener('click', closeRemoveMemberModal);

  if (confirmRemoveMemberBtn) {
    confirmRemoveMemberBtn.addEventListener('click', () => {
      if (!activeMemberId) return;
      const idx = members.findIndex(m => m.id === activeMemberId);
      if (idx !== -1) {
        const removed = members[idx];
        // Remove 'Website Redesign' from project list, or remove member if only that project
        if (removed.projects && removed.projects.length > 1) {
          removed.projects = removed.projects.filter(p => p !== 'Website Redesign');
          showToast(`Removed ${removed.name} from Website Redesign`, 'info');
        } else {
          members.splice(idx, 1);
          showToast(`Removed ${removed.name} from project team`, 'info');
        }
        saveMembers();
        updateSummaryMetrics();
        renderDirectory();
      }
      closeRemoveMemberModal();
    });
  }

  // =========================================================================
  // 9. Cancel Invitation Modal
  // =========================================================================

  function openCancelInviteModal(memberId) {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    activeMemberId = memberId;

    const cancelInviteTitle = document.getElementById('cancelInviteTitle');
    const cancelInviteDesc = document.getElementById('cancelInviteDesc');
    if (cancelInviteTitle) cancelInviteTitle.textContent = `Revoke Invitation for ${member.name}?`;
    if (cancelInviteDesc) cancelInviteDesc.textContent = `The pending invitation sent to ${member.email} will be invalidated immediately.`;

    if (cancelInviteModalBackdrop) cancelInviteModalBackdrop.classList.add('show');
  }

  function closeCancelInviteModal() {
    if (cancelInviteModalBackdrop) cancelInviteModalBackdrop.classList.remove('show');
  }

  if (dismissCancelInviteBtn) dismissCancelInviteBtn.addEventListener('click', closeCancelInviteModal);

  if (confirmCancelInviteBtn) {
    confirmCancelInviteBtn.addEventListener('click', () => {
      if (!activeMemberId) return;
      const idx = members.findIndex(m => m.id === activeMemberId);
      if (idx !== -1) {
        const m = members[idx];
        members.splice(idx, 1);
        saveMembers();
        updateSummaryMetrics();
        renderDirectory();
        showToast(`Revoked invitation for ${m.email}`, 'info');
      }
      closeCancelInviteModal();
    });
  }

  // =========================================================================
  // 10. Multi-Email Invite Modal
  // =========================================================================

  let inviteEmails = [];

  function openInviteModal() {
    inviteEmails = [];
    renderEmailChips();
    if (inviteEmailInput) inviteEmailInput.value = '';
    if (inviteMessageInput) inviteMessageInput.value = '';
    if (inviteRoleSelect) inviteRoleSelect.value = 'Member';
    updateRoleHelpText();

    // Check default project
    document.querySelectorAll('.project-checkbox').forEach(chk => {
      chk.checked = (chk.value === 'Website Redesign');
    });

    if (inviteModalBackdrop) inviteModalBackdrop.classList.add('show');
    setTimeout(() => {
      if (inviteEmailInput) inviteEmailInput.focus();
    }, 100);
  }

  function closeInviteModal() {
    if (inviteModalBackdrop) inviteModalBackdrop.classList.remove('show');
  }

  if (openInviteModalBtn) openInviteModalBtn.addEventListener('click', openInviteModal);
  if (closeInviteModalBtn) closeInviteModalBtn.addEventListener('click', closeInviteModal);
  if (cancelInviteBtn) cancelInviteBtn.addEventListener('click', closeInviteModal);

  function renderEmailChips() {
    if (!chipsInputContainer || !inviteEmailInput) return;
    // Remove existing chip elements
    chipsInputContainer.querySelectorAll('.email-chip').forEach(el => el.remove());

    inviteEmails.forEach((email, idx) => {
      const chip = document.createElement('span');
      chip.className = 'email-chip';
      chip.innerHTML = `
        <span>${escapeHtml(email)}</span>
        <button type="button" class="chip-remove-btn" data-index="${idx}" aria-label="Remove email">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      `;
      chipsInputContainer.insertBefore(chip, inviteEmailInput);
    });

    // Attach chip remove listeners
    chipsInputContainer.querySelectorAll('.chip-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index, 10);
        inviteEmails.splice(index, 1);
        renderEmailChips();
      });
    });
  }

  function addEmailChip(rawVal) {
    const email = rawVal.trim().toLowerCase();
    if (!email) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Please enter a valid email address (e.g. name@domain.com)', 'error');
      return;
    }

    // Check duplicate in pending list
    if (inviteEmails.includes(email)) {
      showToast('This email is already in the invitation list', 'info');
      return;
    }

    // Check already existing team member
    const existing = members.find(m => m.email.toLowerCase() === email);
    if (existing) {
      showToast(`${existing.name} is already a member (${existing.status})`, 'error');
      return;
    }

    inviteEmails.push(email);
    renderEmailChips();
    if (inviteEmailInput) inviteEmailInput.value = '';
  }

  if (inviteEmailInput) {
    inviteEmailInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
        e.preventDefault();
        addEmailChip(inviteEmailInput.value);
      } else if (e.key === 'Backspace' && inviteEmailInput.value === '' && inviteEmails.length > 0) {
        inviteEmails.pop();
        renderEmailChips();
      }
    });

    inviteEmailInput.addEventListener('blur', () => {
      if (inviteEmailInput.value.trim()) {
        addEmailChip(inviteEmailInput.value);
      }
    });
  }

  if (chipsInputContainer) {
    chipsInputContainer.addEventListener('click', () => {
      if (inviteEmailInput) inviteEmailInput.focus();
    });
  }

  function updateRoleHelpText() {
    if (!roleHelpText || !inviteRoleSelect) return;
    switch (inviteRoleSelect.value) {
      case 'Admin':
        roleHelpText.textContent = 'Admins can manage projects, assign roles, edit team roster, and adjust billing.';
        break;
      case 'Project Lead':
        roleHelpText.textContent = 'Project Leads can assign tasks, edit project settings, and approve sprint deliverables.';
        break;
      case 'Designer':
        roleHelpText.textContent = 'Designers can manage UI/UX tasks, upload media assets, and comment on design files.';
        break;
      case 'Developer':
        roleHelpText.textContent = 'Developers can create and update tasks, log sprints, and connect code repositories.';
        break;
      case 'Member': default:
        roleHelpText.textContent = 'Members can view assigned tasks, update their progress, and post project discussions.';
        break;
    }
  }

  if (inviteRoleSelect) {
    inviteRoleSelect.addEventListener('change', updateRoleHelpText);
  }

  if (inviteForm) {
    inviteForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // If user typed an email without pressing enter, add it
      if (inviteEmailInput && inviteEmailInput.value.trim()) {
        addEmailChip(inviteEmailInput.value);
      }

      if (inviteEmails.length === 0) {
        showToast('Please enter at least one valid collaborator email address.', 'error');
        if (inviteEmailInput) inviteEmailInput.focus();
        return;
      }

      const role = inviteRoleSelect ? inviteRoleSelect.value : 'Member';

      // Collect selected projects
      const selectedProjects = [];
      document.querySelectorAll('.project-checkbox:checked').forEach(chk => {
        selectedProjects.push(chk.value);
      });

      if (selectedProjects.length === 0) {
        selectedProjects.push('Website Redesign');
      }

      // Simulate sending via backend API
      if (sendInviteSubmitBtn) {
        sendInviteSubmitBtn.disabled = true;
        const textSpan = document.getElementById('sendInviteBtnText');
        if (textSpan) textSpan.textContent = 'Sending...';
      }

      setTimeout(() => {
        const today = new Date();
        const dateFormatted = today.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        const dateIso = today.toISOString().split('T')[0];

        inviteEmails.forEach(email => {
          const namePart = email.split('@')[0].replace(/[._]/g, ' ');
          const formattedName = namePart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          const initials = formattedName.split(' ').map(w => w.charAt(0)).join('').substring(0, 2).toUpperCase();

          const newMember = {
            id: 'usr-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            name: formattedName,
            email: email,
            role: role,
            status: 'Pending Invitation',
            projects: selectedProjects,
            dateAdded: dateIso,
            dateAddedFormatted: dateFormatted,
            avatarColor: getRandomAvatarColor(),
            initials: initials || 'IN',
            isCurrentUser: false,
            bio: `Invited as ${role} for ${selectedProjects.join(', ')}.`,
            recentActivity: [
              { text: `Invitation sent to ${email}`, time: 'Just now' }
            ]
          };

          members.unshift(newMember);
        });

        saveMembers();
        updateSummaryMetrics();
        renderDirectory();

        if (sendInviteSubmitBtn) {
          sendInviteSubmitBtn.disabled = false;
          const textSpan = document.getElementById('sendInviteBtnText');
          if (textSpan) textSpan.textContent = 'Send Invitation';
        }

        closeInviteModal();
        showToast(`Sent ${inviteEmails.length} team invitation${inviteEmails.length > 1 ? 's' : ''}!`, 'success');
      }, 500);
    });
  }

  function getRandomAvatarColor() {
    const colors = ['#2563EB', '#8B5CF6', '#EC4899', '#0D9488', '#F59E0B', '#10B981', '#3B82F6', '#6366F1'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // =========================================================================
  // 11. Search, Filter, Sort & View Toggle Handlers
  // =========================================================================

  if (memberSearchInput) {
    memberSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
      }
      currentPage = 1;
      renderDirectory();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (memberSearchInput) memberSearchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      currentPage = 1;
      renderDirectory();
    });
  }

  if (roleFilterSelect) {
    roleFilterSelect.addEventListener('change', (e) => {
      selectedRole = e.target.value;
      currentPage = 1;
      renderDirectory();
    });
  }

  if (statusFilterSelect) {
    statusFilterSelect.addEventListener('change', (e) => {
      selectedStatus = e.target.value;
      currentPage = 1;
      renderDirectory();
    });
  }

  if (projectFilterSelect) {
    projectFilterSelect.addEventListener('change', (e) => {
      selectedProject = e.target.value;
      currentPage = 1;
      renderDirectory();
    });
  }

  if (sortOrderSelect) {
    sortOrderSelect.addEventListener('change', (e) => {
      sortOrder = e.target.value;
      renderDirectory();
    });
  }

  function resetAllFilters() {
    searchQuery = '';
    selectedRole = 'All';
    selectedStatus = 'All';
    selectedProject = 'All';

    if (memberSearchInput) memberSearchInput.value = '';
    if (clearSearchBtn) clearSearchBtn.style.display = 'none';
    if (roleFilterSelect) roleFilterSelect.value = 'All';
    if (statusFilterSelect) statusFilterSelect.value = 'All';
    if (projectFilterSelect) projectFilterSelect.value = 'All';

    currentPage = 1;
    renderDirectory();
  }

  if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', resetAllFilters);
  if (emptyActionBtn) emptyActionBtn.addEventListener('click', resetAllFilters);

  // Pagination Next & Prev
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderDirectory();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      const filtered = getFilteredAndSortedMembers();
      const totalPages = Math.ceil(filtered.length / pageSize);
      if (currentPage < totalPages) {
        currentPage++;
        renderDirectory();
      }
    });
  }

  // View Toggle (List vs Grid)
  if (listViewBtn) {
    listViewBtn.addEventListener('click', () => {
      currentView = 'list';
      listViewBtn.classList.add('active');
      listViewBtn.setAttribute('aria-pressed', 'true');
      if (gridViewBtn) {
        gridViewBtn.classList.remove('active');
        gridViewBtn.setAttribute('aria-pressed', 'false');
      }
      renderDirectory();
    });
  }

  if (gridViewBtn) {
    gridViewBtn.addEventListener('click', () => {
      currentView = 'grid';
      gridViewBtn.classList.add('active');
      gridViewBtn.setAttribute('aria-pressed', 'true');
      if (listViewBtn) {
        listViewBtn.classList.remove('active');
        listViewBtn.setAttribute('aria-pressed', 'false');
      }
      renderDirectory();
    });
  }

  // =========================================================================
  // 12. CSV Export Feature
  // =========================================================================

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const filtered = getFilteredAndSortedMembers();
      if (filtered.length === 0) {
        showToast('No member records to export with active filters.', 'info');
        return;
      }

      let csv = 'ID,Name,Email,Role,Status,Projects,Date Added\n';
      filtered.forEach(m => {
        const row = [
          `"${m.id}"`,
          `"${m.name.replace(/"/g, '""')}"`,
          `"${m.email.replace(/"/g, '""')}"`,
          `"${m.role}"`,
          `"${m.status}"`,
          `"${(m.projects || []).join('; ')}"`,
          `"${m.dateAddedFormatted || m.dateAdded}"`
        ];
        csv += row.join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `taskflow-team-members-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported ${filtered.length} team members to CSV`, 'success');
    });
  }

  // =========================================================================
  // 13. Dropdowns & Global Interactivity
  // =========================================================================

  function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
    const wsBtn = document.getElementById('workspaceBtn');
    if (wsBtn) wsBtn.setAttribute('aria-expanded', 'false');
    const headerAvBtn = document.getElementById('headerAvatarBtn');
    if (headerAvBtn) headerAvBtn.setAttribute('aria-expanded', 'false');
    const profileBtn = document.getElementById('profileBtn') || document.getElementById('sidebarUserProfileBtn');
    if (profileBtn) profileBtn.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-menu') &&
        !e.target.closest('.workspace-selector-btn') &&
        !e.target.closest('.user-profile-btn') &&
        !e.target.closest('.header-profile-btn') &&
        !e.target.closest('.header-avatar-btn') &&
        !e.target.closest('.header-icon-btn') &&
        !e.target.closest('.action-menu-trigger')) {
      closeAllDropdowns();
    }
  });

  // Workspace Selector
  const workspaceBtn = document.getElementById('workspaceBtn');
  const workspaceDropdown = document.getElementById('workspaceDropdown');
  if (workspaceBtn && workspaceDropdown) {
    workspaceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isShow = workspaceDropdown.classList.contains('show');
      closeAllDropdowns();
      if (!isShow) {
        workspaceDropdown.classList.add('show');
        workspaceBtn.setAttribute('aria-expanded', 'true');
      }
    });

    workspaceDropdown.querySelectorAll('.ws-item').forEach(item => {
      item.addEventListener('click', () => {
        const wsName = item.dataset.workspace;
        const wsAvatar = item.dataset.avatar;
        if (currentWorkspaceName) currentWorkspaceName.textContent = wsName;
        if (currentWorkspaceAvatar) currentWorkspaceAvatar.textContent = wsAvatar;
        localStorage.setItem(STORAGE_KEY_WORKSPACE, wsName);

        workspaceDropdown.querySelectorAll('.ws-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        closeAllDropdowns();
        showToast(`Switched workspace to ${wsName}`, 'success');
      });
    });
  }

  // User Profile Dropdown (Sidebar)
  const sidebarProfileBtn = document.getElementById('profileBtn') || document.getElementById('sidebarUserProfileBtn');
  const sidebarProfileDropdown = document.getElementById('profileDropdown') || document.getElementById('sidebarUserProfileDropdown');
  if (sidebarProfileBtn && sidebarProfileDropdown) {
    sidebarProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isShow = sidebarProfileDropdown.classList.contains('show');
      closeAllDropdowns();
      if (!isShow) {
        sidebarProfileDropdown.classList.add('show');
        sidebarProfileBtn.setAttribute('aria-expanded', 'true');
      }
    });
  }

  // Header Avatar / Profile Dropdown (Top Right)
  const headerAvatarBtn = document.getElementById('headerAvatarBtn');
  const headerProfileDropdown = document.getElementById('headerProfileDropdown');
  if (headerAvatarBtn && headerProfileDropdown) {
    headerAvatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isShow = headerProfileDropdown.classList.contains('show');
      closeAllDropdowns();
      if (!isShow) {
        headerProfileDropdown.classList.add('show');
        headerAvatarBtn.setAttribute('aria-expanded', 'true');
      }
    });
  }

  // Help Dropdown
  const helpHeaderBtn = document.getElementById('helpHeaderBtn');
  const helpDropdown = document.getElementById('helpDropdown');
  if (helpHeaderBtn && helpDropdown) {
    helpHeaderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isShow = helpDropdown.classList.contains('show');
      closeAllDropdowns();
      if (!isShow) {
        helpDropdown.classList.add('show');
      }
    });
  }

  // Edit Profile Name & Role Modal
  const editProfileModalBackdrop = document.getElementById('editProfileModalBackdrop');
  const editProfileNameInput = document.getElementById('editProfileNameInput');
  const editProfileRoleInput = document.getElementById('editProfileRoleInput');
  const saveEditProfileBtn = document.getElementById('saveEditProfileBtn');
  const cancelEditProfileBtn = document.getElementById('cancelEditProfileBtn');

  function openEditProfileModal() {
    closeAllDropdowns();
    if (editProfileNameInput) editProfileNameInput.value = currentUserProfile.name;
    if (editProfileRoleInput) editProfileRoleInput.value = currentUserProfile.role;
    if (editProfileModalBackdrop) editProfileModalBackdrop.classList.add('show');
  }

  const menuEditProfile = document.getElementById('menuEditProfile');
  const headerMenuEditProfile = document.getElementById('headerMenuEditProfile');
  if (menuEditProfile) menuEditProfile.addEventListener('click', openEditProfileModal);
  if (headerMenuEditProfile) headerMenuEditProfile.addEventListener('click', openEditProfileModal);

  if (cancelEditProfileBtn) {
    cancelEditProfileBtn.addEventListener('click', () => {
      if (editProfileModalBackdrop) editProfileModalBackdrop.classList.remove('show');
    });
  }

  if (saveEditProfileBtn) {
    saveEditProfileBtn.addEventListener('click', () => {
      const newName = (editProfileNameInput ? editProfileNameInput.value.trim() : '') || 'Your Name';
      const newRole = (editProfileRoleInput ? editProfileRoleInput.value.trim() : '') || 'Product Lead';
      const initials = newName.split(' ').map(w => w.charAt(0)).join('').substring(0, 2).toUpperCase() || 'YB';

      currentUserProfile.name = newName;
      currentUserProfile.role = newRole;
      currentUserProfile.initials = initials;

      localStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(currentUserProfile));

      // Update current user in members array
      const currentMember = members.find(m => m.isCurrentUser);
      if (currentMember) {
        currentMember.name = newName;
        currentMember.initials = initials;
        saveMembers();
      }

      renderUserProfileUI();
      renderDirectory();

      if (editProfileModalBackdrop) editProfileModalBackdrop.classList.remove('show');
      showToast('Profile display name updated successfully!', 'success');
    });
  }

  // Create Workspace Modal
  const createWorkspaceOption = document.getElementById('createWorkspaceOption');
  const createWorkspaceModalBackdrop = document.getElementById('createWorkspaceModalBackdrop');
  const newWorkspaceNameInput = document.getElementById('newWorkspaceNameInput');
  const confirmCreateWsBtn = document.getElementById('confirmCreateWsBtn');
  const cancelCreateWsBtn = document.getElementById('cancelCreateWsBtn');

  if (createWorkspaceOption && createWorkspaceModalBackdrop) {
    createWorkspaceOption.addEventListener('click', () => {
      closeAllDropdowns();
      if (newWorkspaceNameInput) newWorkspaceNameInput.value = '';
      createWorkspaceModalBackdrop.classList.add('show');
    });
  }

  if (cancelCreateWsBtn && createWorkspaceModalBackdrop) {
    cancelCreateWsBtn.addEventListener('click', () => {
      createWorkspaceModalBackdrop.classList.remove('show');
    });
  }

  if (confirmCreateWsBtn) {
    confirmCreateWsBtn.addEventListener('click', () => {
      const wsName = (newWorkspaceNameInput ? newWorkspaceNameInput.value.trim() : '') || 'New Workspace';
      const wsAvatar = wsName.charAt(0).toUpperCase();

      if (currentWorkspaceName) currentWorkspaceName.textContent = wsName;
      if (currentWorkspaceAvatar) currentWorkspaceAvatar.textContent = wsAvatar;
      localStorage.setItem(STORAGE_KEY_WORKSPACE, wsName);

      if (createWorkspaceModalBackdrop) createWorkspaceModalBackdrop.classList.remove('show');
      showToast(`Created and switched to workspace: ${wsName}`, 'success');
    });
  }

  // Mobile Sidebar Hamburger & Close
  const mobileHamburgerBtn = document.getElementById('mobileHamburgerBtn');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const appSidebar = document.getElementById('appSidebar');

  function openMobileSidebar() {
    if (appSidebar) appSidebar.classList.add('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('show');
  }

  function closeMobileSidebar() {
    if (appSidebar) appSidebar.classList.remove('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('show');
  }

  if (mobileHamburgerBtn) mobileHamburgerBtn.addEventListener('click', openMobileSidebar);
  if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeMobileSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileSidebar);

  // Global Ctrl+K Search Shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const globalSearch = document.getElementById('globalSearchInput');
      if (globalSearch) globalSearch.focus();
    }
  });

  // Global Toast Notifications
  function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <span>${escapeHtml(message)}</span>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 3500);
  }

  // HTML sanitization helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // API Integration
  async function fetchMembersFromAPI() {
    if (typeof TaskFlowAPI === 'undefined' || !TaskFlowAPI.isAuthenticated()) return;
    try {
      const users = await TaskFlowAPI.getUsers();
      if (users && Array.isArray(users)) {
        const currUser = TaskFlowAPI.getUser();
        members = users.map(u => ({
          id: `usr-${u.id}`,
          rawId: u.id,
          name: u.full_name || u.email,
          email: u.email,
          role: u.job_title || 'Team Member',
          status: 'Active',
          projects: [],
          dateAdded: u.created_at ? u.created_at.split('T')[0] : '2026-10-11',
          dateAddedFormatted: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Recently',
          avatarColor: u.avatar_color || '#2563EB',
          initials: u.initials || (u.full_name ? u.full_name.slice(0, 2).toUpperCase() : 'TF'),
          isCurrentUser: currUser ? (u.id === currUser.id || u.email === currUser.email) : false,
          bio: u.bio || `${u.job_title || 'Member'} in ${u.department || 'General'}.`,
          department: u.department || 'General',
          recentActivity: [
            { text: 'Active in workspace', time: 'Recently' }
          ]
        }));
        saveMembers();
        updateSummaryMetrics();
        renderDirectory();
      }
    } catch (e) {
      console.warn('Could not fetch members from API:', e);
    }
  }

  // Initial Calculation & Render
  updateSummaryMetrics();
  renderDirectory();
  fetchMembersFromAPI();

  if (window.TaskFlowWS) {
    TaskFlowWS.onNotification(() => {
      fetchMembersFromAPI();
    });
    TaskFlowWS.onReconnect(() => {
      fetchMembersFromAPI();
    });
  }
});
