/**
 * TaskFlow — Interface 12: Create Project Page
 * Pure Vanilla JavaScript Application Logic
 * 
 * Features:
 * - Full two-column responsive layout state management
 * - Live dynamic sync between form inputs and the Project Summary Preview
 * - Dynamic Before-You-Create checklist verification
 * - Swatch color selector & accessible keyboard navigation
 * - Card-based project visibility switcher
 * - Searchable Project Lead selector with avatar preview
 * - Team member search, multi-selection, avatar chips, and removal
 * - Strict date validation (dueDate >= startDate) with inline feedback
 * - Unsaved changes dirty tracking & confirmation modal on cancel
 * - Save as Draft & Create Project actions with local storage persistence
 * - Seamless integration with project-details.html and projects.html
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. Workspace Seed & Eligible Users Data
  // =========================================================================
  const ELIGIBLE_USERS = [
    { id: 'usr-1', name: 'Alex Morgan', role: 'UI/UX Designer', email: 'alex.morgan@workspace.com', initials: 'AM', avClass: 'av-alex' },
    { id: 'usr-2', name: 'Sarah Wilson', role: 'Design Lead', email: 'sarah.wilson@workspace.com', initials: 'SW', avClass: 'av-sarah' },
    { id: 'usr-3', name: 'Marcus Lee', role: 'Frontend Developer', email: 'marcus.lee@workspace.com', initials: 'ML', avClass: 'av-marcus' },
    { id: 'usr-4', name: 'Jordan Davis', role: 'Backend Developer', email: 'jordan.davis@workspace.com', initials: 'JD', avClass: 'av-jordan' },
    { id: 'usr-5', name: 'Elena Rostova', role: 'QA Engineer', email: 'elena.rostova@workspace.com', initials: 'ER', avClass: 'av-elena' },
    { id: 'usr-6', name: 'Your Name', role: 'Product Lead', email: 'your.email@workspace.com', initials: 'YB', avClass: 'av-lead' }
  ];

  // Category Icon & Details Map
  const CATEGORY_MAP = {
    'Design': { label: 'Design', icon: '🎨' },
    'Development': { label: 'Development', icon: '💻' },
    'Marketing': { label: 'Marketing', icon: '📢' },
    'Research': { label: 'Research', icon: '🔬' },
    'Operations': { label: 'Operations', icon: '⚙️' },
    'Other': { label: 'Other', icon: '📁' }
  };

  // =========================================================================
  // 2. Form State
  // =========================================================================
  const state = {
    projectName: '',
    description: '',
    category: 'Development',
    color: 'blue',
    colorHex: '#2563EB',
    visibility: 'Team',
    startDate: '2026-10-11',
    dueDate: '2026-11-15',
    lead: ELIGIBLE_USERS[5], // Default: Your Name (Product Lead)
    priority: 'Medium',
    selectedMembers: [
      ELIGIBLE_USERS[1], // Sarah Wilson
      ELIGIBLE_USERS[2]  // Marcus Lee
    ],
    isDirty: false,
    memberSearchQuery: '',
    leadSearchQuery: ''
  };

  // User Profile & Active Workspace Reactive State
  const userProfile = {
    name: 'Your Name',
    role: 'Product Lead',
    email: 'your.name@workspace.com',
    initials: 'YB'
  };

  const currentWorkspace = {
    name: 'Team Workspace',
    avatar: 'T',
    color: '#2563EB'
  };

  // =========================================================================
  // 3. DOM Elements Cache
  // =========================================================================
  const dom = {
    form: document.getElementById('createProjectForm'),
    
    // Inputs
    projectNameInput: document.getElementById('projectName'),
    projectNameError: document.getElementById('projectNameError'),
    descriptionInput: document.getElementById('projectDescription'),
    descriptionCounter: document.getElementById('descriptionCounter'),
    categorySelect: document.getElementById('projectCategory'),
    colorSwatchesRow: document.getElementById('colorSwatchesRow'),
    colorInput: document.getElementById('projectColorInput'),
    
    // Visibility
    visPrivateCard: document.getElementById('visPrivateCard'),
    visTeamCard: document.getElementById('visTeamCard'),
    visPrivateRadio: document.getElementById('visPrivateRadio'),
    visTeamRadio: document.getElementById('visTeamRadio'),
    
    // Schedule
    startDateInput: document.getElementById('startDate'),
    dueDateInput: document.getElementById('dueDate'),
    startDateError: document.getElementById('startDateError'),
    dueDateError: document.getElementById('dueDateError'),
    
    // Lead Selector
    leadSelectorBtn: document.getElementById('leadSelectorBtn'),
    leadDropdownMenu: document.getElementById('leadDropdownMenu'),
    leadSearchInput: document.getElementById('leadSearchInput'),
    leadOptionsList: document.getElementById('leadOptionsList'),
    leadAvatarDisplay: document.getElementById('leadAvatarDisplay'),
    leadNameDisplay: document.getElementById('leadNameDisplay'),
    leadRoleDisplay: document.getElementById('leadRoleDisplay'),
    projectLeadInput: document.getElementById('projectLeadInput'),
    projectLeadError: document.getElementById('projectLeadError'),
    
    // Priority
    prioritySelect: document.getElementById('projectPriority'),
    
    // Member search & selection
    memberSearchInput: document.getElementById('memberSearchInput'),
    availableMembersList: document.getElementById('availableMembersList'),
    selectedMembersChips: document.getElementById('selectedMembersChips'),
    selectedCountLabel: document.getElementById('selectedMembersCountLabel'),
    clearAllMembersBtn: document.getElementById('clearAllMembersBtn'),
    
    // Summary Preview
    previewColorBadge: document.getElementById('previewColorBadge'),
    previewHeroAccent: document.getElementById('previewHeroAccent'),
    previewProjectName: document.getElementById('previewProjectName'),
    previewCategoryTag: document.getElementById('previewCategoryTag'),
    previewVisibilityTag: document.getElementById('previewVisibilityTag'),
    previewVisibilityText: document.getElementById('previewVisibilityText'),
    previewDescription: document.getElementById('previewDescription'),
    previewDescStatus: document.getElementById('previewDescStatus'),
    previewTimeline: document.getElementById('previewTimeline'),
    previewDurationBadge: document.getElementById('previewDurationBadge'),
    previewPriorityBadge: document.getElementById('previewPriorityBadge'),
    previewLeadAvatar: document.getElementById('previewLeadAvatar'),
    previewLeadName: document.getElementById('previewLeadName'),
    previewLeadRole: document.getElementById('previewLeadRole'),
    previewAvatarStack: document.getElementById('previewAvatarStack'),
    previewMembersCountText: document.getElementById('previewMembersCountText'),
    previewWorkspaceTarget: document.getElementById('previewWorkspaceTarget'),
    
    // Checklist
    checklistProgressText: document.getElementById('checklistProgressText'),
    checklistStatusMessage: document.getElementById('checklistStatusMessage'),
    checklistStatusMsgText: document.getElementById('checklistStatusMsgText'),
    checkItemName: document.getElementById('checkItemName'),
    checkItemLead: document.getElementById('checkItemLead'),
    checkItemSchedule: document.getElementById('checkItemSchedule'),
    checkItemVisibility: document.getElementById('checkItemVisibility'),
    checkItemMembers: document.getElementById('checkItemMembers'),
    
    // Action Buttons
    cancelTopBtn: document.getElementById('cancelTopBtn'),
    cancelBottomBtn: document.getElementById('cancelBottomBtn'),
    saveDraftBtn: document.getElementById('saveDraftBtn'),
    submitBtn: document.getElementById('createProjectSubmitBtn'),
    submitBtnText: document.getElementById('createBtnText'),
    
    // Workspace & User Profile Dropdowns
    workspaceBtn: document.getElementById('workspaceBtn'),
    workspaceDropdown: document.getElementById('workspaceDropdown'),
    currentWorkspaceName: document.getElementById('currentWorkspaceName'),
    currentWorkspaceAvatar: document.getElementById('currentWorkspaceAvatar'),
    profileBtn: document.getElementById('profileBtn'),
    profileDropdown: document.getElementById('profileDropdown'),
    headerAvatarBtn: document.getElementById('headerAvatarBtn'),
    headerProfileDropdown: document.getElementById('headerProfileDropdown'),
    helpHeaderBtn: document.getElementById('helpHeaderBtn'),
    helpDropdown: document.getElementById('helpDropdown'),

    // Modals & Navigation
    discardModalBackdrop: document.getElementById('discardModalBackdrop'),
    modalKeepEditingBtn: document.getElementById('modalKeepEditingBtn'),
    modalDiscardBtn: document.getElementById('modalDiscardBtn'),
    editProfileModalBackdrop: document.getElementById('editProfileModalBackdrop'),
    createWorkspaceModalBackdrop: document.getElementById('createWorkspaceModalBackdrop'),
    toastContainer: document.getElementById('toastContainer'),
    
    // Mobile Drawer
    mobileHamburgerBtn: document.getElementById('mobileHamburgerBtn'),
    closeSidebarBtn: document.getElementById('closeSidebarBtn'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
    appSidebar: document.getElementById('appSidebar')
  };

  // =========================================================================
  // 4. Initialization
  // =========================================================================
  function init() {
    loadSavedUserData();
    bindEvents();
    renderLeadOptions();
    renderAvailableMembers();
    renderSelectedMemberChips();
    updateLiveSummary();
    updateChecklist();
  }

  // =========================================================================
  // 5. Event Listeners Binding
  // =========================================================================
  function bindEvents() {
    // Project Name Input
    dom.projectNameInput.addEventListener('input', (e) => {
      state.projectName = e.target.value;
      state.isDirty = true;
      clearFieldError(dom.projectNameInput, dom.projectNameError);
      updateLiveSummary();
      updateChecklist();
    });

    // Description Textarea & Character Counter
    dom.descriptionInput.addEventListener('input', (e) => {
      state.description = e.target.value;
      state.isDirty = true;
      dom.descriptionCounter.textContent = `${state.description.length} / 500`;
      updateLiveSummary();
    });

    // Category Select
    dom.categorySelect.addEventListener('change', (e) => {
      state.category = e.target.value;
      state.isDirty = true;
      updateLiveSummary();
    });

    // Color Swatches
    dom.colorSwatchesRow.addEventListener('click', (e) => {
      const swatchBtn = e.target.closest('.color-swatch-btn');
      if (!swatchBtn) return;
      
      const color = swatchBtn.getAttribute('data-color');
      const hex = swatchBtn.getAttribute('data-hex');
      setColorSelection(color, hex);
      state.isDirty = true;
    });

    // Keyboard support for color swatches
    dom.colorSwatchesRow.querySelectorAll('.color-swatch-btn').forEach(btn => {
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });

    // Visibility Card Radios
    dom.visPrivateRadio.addEventListener('change', () => {
      setVisibility('Private');
      state.isDirty = true;
    });

    dom.visTeamRadio.addEventListener('change', () => {
      setVisibility('Team');
      state.isDirty = true;
    });

    // Schedule Dates
    dom.startDateInput.addEventListener('change', (e) => {
      state.startDate = e.target.value;
      state.isDirty = true;
      validateDates();
      updateLiveSummary();
      updateChecklist();
    });

    dom.dueDateInput.addEventListener('change', (e) => {
      state.dueDate = e.target.value;
      state.isDirty = true;
      validateDates();
      updateLiveSummary();
      updateChecklist();
    });

    // Priority Select
    dom.prioritySelect.addEventListener('change', (e) => {
      state.priority = e.target.value;
      state.isDirty = true;
      updateLiveSummary();
    });

    // Project Lead Custom Dropdown
    dom.leadSelectorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLeadDropdown();
    });

    dom.leadSearchInput.addEventListener('input', (e) => {
      state.leadSearchQuery = e.target.value.toLowerCase();
      renderLeadOptions();
    });

    // Close lead dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!dom.leadSelectorBtn.contains(e.target) && !dom.leadDropdownMenu.contains(e.target)) {
        closeLeadDropdown();
      }
    });

    // Member Search Input
    dom.memberSearchInput.addEventListener('input', (e) => {
      state.memberSearchQuery = e.target.value.trim().toLowerCase();
      renderAvailableMembers();
    });

    // Clear All Members
    dom.clearAllMembersBtn.addEventListener('click', () => {
      if (state.selectedMembers.length === 0) return;
      state.selectedMembers = [];
      state.isDirty = true;
      renderAvailableMembers();
      renderSelectedMemberChips();
      updateLiveSummary();
      updateChecklist();
      showToast('All invited members cleared.', 'warning');
    });

    // Form Submission
    dom.form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFormSubmit();
    });

    // Save as Draft
    dom.saveDraftBtn.addEventListener('click', () => {
      handleSaveDraft();
    });

    // Cancel Actions
    dom.cancelTopBtn.addEventListener('click', handleCancel);
    dom.cancelBottomBtn.addEventListener('click', handleCancel);

    // Discard Modal Actions
    dom.modalKeepEditingBtn.addEventListener('click', () => {
      closeDiscardModal();
    });

    dom.modalDiscardBtn.addEventListener('click', () => {
      window.location.href = 'projects.html';
    });

    // Mobile Sidebar Drawer
    if (dom.mobileHamburgerBtn) {
      dom.mobileHamburgerBtn.addEventListener('click', () => {
        dom.appSidebar.classList.add('open');
        dom.sidebarBackdrop.classList.add('active');
      });
    }

    if (dom.closeSidebarBtn) {
      dom.closeSidebarBtn.addEventListener('click', () => {
        dom.appSidebar.classList.remove('open');
        dom.sidebarBackdrop.classList.remove('active');
      });
    }

    if (dom.sidebarBackdrop) {
      dom.sidebarBackdrop.addEventListener('click', () => {
        dom.appSidebar.classList.remove('open');
        dom.sidebarBackdrop.classList.remove('active');
      });
    }

    // Initialize Workspace and Profile dropdown interactions
    initWorkspaceAndProfileDropdowns();

    // Keyboard Shortcuts (Ctrl+K search, Esc to close modals & dropdowns)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const globalSearch = document.getElementById('globalSearchInput');
        if (globalSearch) globalSearch.focus();
      } else if (e.key === 'Escape') {
        closeAllDropdowns();
        closeDiscardModal();
        closeEditProfileModal();
        closeCreateWorkspaceModal();
      }
    });
  }

  // =========================================================================
  // 5.1 Workspace & Profile Dropdown Management
  // =========================================================================
  function loadSavedUserData() {
    try {
      const savedUser = localStorage.getItem('taskflow_user_profile');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.name) userProfile.name = parsed.name;
        if (parsed.role) userProfile.role = parsed.role;
        if (parsed.email) userProfile.email = parsed.email;
        if (parsed.initials) userProfile.initials = parsed.initials;
      }
      const savedWs = localStorage.getItem('taskflow_current_workspace');
      if (savedWs) {
        currentWorkspace.name = savedWs;
      }
    } catch (e) {
      console.warn('Failed to parse local profile/workspace', e);
    }
    applyUserProfileEverywhere();
    applyWorkspaceSelection(currentWorkspace.name, false);
  }

  function applyUserProfileEverywhere() {
    // Calculate initials
    const parts = userProfile.name.trim().split(/\s+/);
    userProfile.initials = parts.length > 1 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (parts[0].slice(0, 2)).toUpperCase();

    // 1. Sidebar Profile Row
    const sidebarName = document.getElementById('sidebarUserName');
    if (sidebarName) sidebarName.textContent = userProfile.name;
    const sidebarRole = document.getElementById('sidebarUserRole');
    if (sidebarRole) sidebarRole.textContent = userProfile.role;
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    if (sidebarAvatar) sidebarAvatar.textContent = userProfile.initials;

    // 2. Sidebar Profile Dropdown Menu
    const profileMenuName = document.getElementById('profileMenuName');
    if (profileMenuName) profileMenuName.textContent = userProfile.name;
    const profileMenuEmail = document.getElementById('profileMenuEmail');
    if (profileMenuEmail) profileMenuEmail.textContent = userProfile.email;
    const profileMenuAvatar = document.getElementById('profileMenuAvatar');
    if (profileMenuAvatar) profileMenuAvatar.textContent = userProfile.initials;
    const profileMenuStatus = document.getElementById('profileMenuStatus');
    if (profileMenuStatus) profileMenuStatus.textContent = `Active • ${userProfile.role}`;

    // 3. Header Avatar, Header Name, Role & Header Profile Dropdown
    const headerAvatarInitials = document.getElementById('headerAvatarInitials');
    if (headerAvatarInitials) headerAvatarInitials.textContent = userProfile.initials;
    const headerUserName = document.getElementById('headerUserName');
    if (headerUserName) headerUserName.textContent = userProfile.name;
    const headerUserRole = document.getElementById('headerUserRole');
    if (headerUserRole) headerUserRole.textContent = userProfile.role;
    const headerMenuName = document.getElementById('headerMenuName');
    if (headerMenuName) headerMenuName.textContent = userProfile.name;
    const headerMenuEmail = document.getElementById('headerMenuEmail');
    if (headerMenuEmail) headerMenuEmail.textContent = userProfile.email;
    const headerMenuAvatar = document.getElementById('headerMenuAvatar');
    if (headerMenuAvatar) headerMenuAvatar.textContent = userProfile.initials;
    const headerMenuStatus = document.getElementById('headerMenuStatus');
    if (headerMenuStatus) headerMenuStatus.textContent = `Active • ${userProfile.role}`;

    // 4. Update eligible lead user #6 ('Your Name')
    ELIGIBLE_USERS[5].name = userProfile.name;
    ELIGIBLE_USERS[5].role = userProfile.role;
    ELIGIBLE_USERS[5].initials = userProfile.initials;

    // If current selected lead is user #6, update lead displays
    if (state.lead && state.lead.id === 'usr-6') {
      state.lead.name = userProfile.name;
      state.lead.role = userProfile.role;
      state.lead.initials = userProfile.initials;
      if (dom.leadNameDisplay) dom.leadNameDisplay.textContent = userProfile.name;
      if (dom.leadRoleDisplay) dom.leadRoleDisplay.textContent = userProfile.role;
      if (dom.leadAvatarDisplay) dom.leadAvatarDisplay.textContent = userProfile.initials;
      updateLiveSummary();
    }
  }

  function applyWorkspaceSelection(workspaceName, showToastMsg = true) {
    currentWorkspace.name = workspaceName;
    const currentWorkspaceName = document.getElementById('currentWorkspaceName');
    if (currentWorkspaceName) currentWorkspaceName.textContent = workspaceName;

    const currentWorkspaceAvatar = document.getElementById('currentWorkspaceAvatar');
    if (currentWorkspaceAvatar) {
      currentWorkspaceAvatar.textContent = workspaceName.charAt(0).toUpperCase();
    }

    // Update target workspace in right panel Project Summary preview tile!
    const previewWorkspaceTarget = document.getElementById('previewWorkspaceTarget');
    if (previewWorkspaceTarget) {
      previewWorkspaceTarget.textContent = workspaceName;
    }

    // Update active class in dropdown items
    document.querySelectorAll('#workspaceDropdown .ws-item').forEach(item => {
      const match = item.getAttribute('data-workspace') === workspaceName;
      item.classList.toggle('active', match);
    });

    try {
      localStorage.setItem('taskflow_current_workspace', workspaceName);
    } catch (e) {}

    if (showToastMsg) {
      showToast(`Switched to workspace: ${workspaceName}`, 'success');
    }
  }

  function closeAllDropdowns() {
    const dropdowns = [
      document.getElementById('workspaceDropdown'),
      document.getElementById('profileDropdown'),
      document.getElementById('headerProfileDropdown'),
      document.getElementById('helpDropdown'),
      dom.leadDropdownMenu
    ];
    dropdowns.forEach(d => {
      if (d) d.classList.remove('active');
    });

    const triggerButtons = [
      document.getElementById('workspaceBtn'),
      document.getElementById('profileBtn'),
      document.getElementById('headerAvatarBtn'),
      document.getElementById('helpHeaderBtn'),
      dom.leadSelectorBtn
    ];
    triggerButtons.forEach(b => {
      if (b) {
        b.classList.remove('open');
        b.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function openEditProfileModal() {
    closeAllDropdowns();
    const editProfileBackdrop = document.getElementById('editProfileModalBackdrop');
    const editProfileNameInput = document.getElementById('editProfileNameInput');
    const editProfileRoleInput = document.getElementById('editProfileRoleInput');
    if (editProfileNameInput) editProfileNameInput.value = userProfile.name;
    if (editProfileRoleInput) editProfileRoleInput.value = userProfile.role;
    if (editProfileBackdrop) editProfileBackdrop.classList.add('active');
    if (editProfileNameInput) editProfileNameInput.focus();
  }

  function closeEditProfileModal() {
    const editProfileBackdrop = document.getElementById('editProfileModalBackdrop');
    if (editProfileBackdrop) editProfileBackdrop.classList.remove('active');
  }

  function openCreateWorkspaceModal() {
    closeAllDropdowns();
    const createWsBackdrop = document.getElementById('createWorkspaceModalBackdrop');
    const newWorkspaceNameInput = document.getElementById('newWorkspaceNameInput');
    if (newWorkspaceNameInput) newWorkspaceNameInput.value = '';
    if (createWsBackdrop) createWsBackdrop.classList.add('active');
    if (newWorkspaceNameInput) newWorkspaceNameInput.focus();
  }

  function closeCreateWorkspaceModal() {
    const createWsBackdrop = document.getElementById('createWorkspaceModalBackdrop');
    if (createWsBackdrop) createWsBackdrop.classList.remove('active');
  }

  function initWorkspaceAndProfileDropdowns() {
    // Workspace Button Trigger
    const wsBtn = document.getElementById('workspaceBtn');
    const wsMenu = document.getElementById('workspaceDropdown');
    if (wsBtn && wsMenu) {
      wsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = wsMenu.classList.contains('active');
        closeAllDropdowns();
        if (!isOpen) {
          wsMenu.classList.add('active');
          wsBtn.classList.add('open');
          wsBtn.setAttribute('aria-expanded', 'true');
        }
      });
    }

    // Workspace Item Clicks
    document.querySelectorAll('#workspaceDropdown .ws-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const wsName = item.getAttribute('data-workspace');
        applyWorkspaceSelection(wsName, true);
        closeAllDropdowns();
      });
    });

    const createWsOption = document.getElementById('createWorkspaceOption');
    if (createWsOption) {
      createWsOption.addEventListener('click', (e) => {
        e.stopPropagation();
        openCreateWorkspaceModal();
      });
    }

    // Sidebar Profile Button Trigger
    const profBtn = document.getElementById('profileBtn');
    const profMenu = document.getElementById('profileDropdown');
    if (profBtn && profMenu) {
      profBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = profMenu.classList.contains('active');
        closeAllDropdowns();
        if (!isOpen) {
          profMenu.classList.add('active');
          profBtn.classList.add('open');
          profBtn.setAttribute('aria-expanded', 'true');
        }
      });
    }

    // Header Avatar Button Trigger
    const headerAvatarBtn = document.getElementById('headerAvatarBtn');
    const headerProfMenu = document.getElementById('headerProfileDropdown');
    if (headerAvatarBtn && headerProfMenu) {
      headerAvatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = headerProfMenu.classList.contains('active');
        closeAllDropdowns();
        if (!isOpen) {
          headerProfMenu.classList.add('active');
          headerAvatarBtn.classList.add('open');
          headerAvatarBtn.setAttribute('aria-expanded', 'true');
        }
      });
    }

    // Help Button Trigger
    const helpBtn = document.getElementById('helpHeaderBtn');
    const helpMenu = document.getElementById('helpDropdown');
    if (helpBtn && helpMenu) {
      helpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = helpMenu.classList.contains('active');
        closeAllDropdowns();
        if (!isOpen) {
          helpMenu.classList.add('active');
        }
      });
    }

    // Menu items for Edit Profile
    ['menuEditProfile', 'headerMenuEditProfile'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditProfileModal();
        });
      }
    });

    // Edit Profile Modal Buttons
    const cancelEditProfileBtn = document.getElementById('cancelEditProfileBtn');
    const saveEditProfileBtn = document.getElementById('saveEditProfileBtn');
    const editProfileNameInput = document.getElementById('editProfileNameInput');
    const editProfileRoleInput = document.getElementById('editProfileRoleInput');

    if (cancelEditProfileBtn) cancelEditProfileBtn.addEventListener('click', closeEditProfileModal);
    if (saveEditProfileBtn) {
      saveEditProfileBtn.addEventListener('click', () => {
        const newName = (editProfileNameInput.value || '').trim();
        const newRole = (editProfileRoleInput.value || '').trim();
        if (!newName) {
          showToast('Please enter a display name', 'error');
          return;
        }
        userProfile.name = newName;
        if (newRole) userProfile.role = newRole;
        try {
          localStorage.setItem('taskflow_user_profile', JSON.stringify(userProfile));
        } catch (e) {}
        applyUserProfileEverywhere();
        closeEditProfileModal();
        showToast(`User name updated to: ${newName}`, 'success');
      });
    }

    // Create Workspace Modal Buttons
    const cancelCreateWsBtn = document.getElementById('cancelCreateWsBtn');
    const confirmCreateWsBtn = document.getElementById('confirmCreateWsBtn');
    const newWorkspaceNameInput = document.getElementById('newWorkspaceNameInput');

    if (cancelCreateWsBtn) cancelCreateWsBtn.addEventListener('click', closeCreateWorkspaceModal);
    if (confirmCreateWsBtn) {
      confirmCreateWsBtn.addEventListener('click', () => {
        const wsName = (newWorkspaceNameInput.value || '').trim();
        if (!wsName) {
          showToast('Please enter a workspace name', 'error');
          return;
        }
        applyWorkspaceSelection(wsName, true);
        closeCreateWorkspaceModal();
      });
    }

    // Log Out buttons
    ['menuLogOut', 'headerMenuLogOut'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => {
          showToast('Logging out of TaskFlow...', 'info');
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 600);
        });
      }
    });

    // Settings & My Profile buttons
    ['menuMyProfile', 'headerMenuProfile'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => {
          closeAllDropdowns();
          showToast('Opening My Profile details...', 'info');
        });
      }
    });

    ['menuAccountSettings', 'headerMenuSettings', 'sidebarSettingsBtn', 'workspaceSettingsOption'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => {
          closeAllDropdowns();
          showToast('Opening Account & Workspace Settings...', 'info');
        });
      }
    });

    // Close on Click Outside
    document.addEventListener('click', (e) => {
      const wsBtn = document.getElementById('workspaceBtn');
      const wsMenu = document.getElementById('workspaceDropdown');
      if (wsBtn && wsMenu && !wsBtn.contains(e.target) && !wsMenu.contains(e.target)) {
        wsMenu.classList.remove('active');
        wsBtn.classList.remove('open');
        wsBtn.setAttribute('aria-expanded', 'false');
      }

      const profBtn = document.getElementById('profileBtn');
      const profMenu = document.getElementById('profileDropdown');
      if (profBtn && profMenu && !profBtn.contains(e.target) && !profMenu.contains(e.target)) {
        profMenu.classList.remove('active');
        profBtn.classList.remove('open');
        profBtn.setAttribute('aria-expanded', 'false');
      }

      const hdrBtn = document.getElementById('headerAvatarBtn');
      const hdrMenu = document.getElementById('headerProfileDropdown');
      if (hdrBtn && hdrMenu && !hdrBtn.contains(e.target) && !hdrMenu.contains(e.target)) {
        hdrMenu.classList.remove('active');
        hdrBtn.classList.remove('open');
        hdrBtn.setAttribute('aria-expanded', 'false');
      }

      const helpBtn = document.getElementById('helpHeaderBtn');
      const helpMenu = document.getElementById('helpDropdown');
      if (helpBtn && helpMenu && !helpBtn.contains(e.target) && !helpMenu.contains(e.target)) {
        helpMenu.classList.remove('active');
      }
    });
  }

  // =========================================================================
  // 6. Color Swatch Handling
  // =========================================================================
  function setColorSelection(color, hex) {
    state.color = color;
    state.colorHex = hex;
    dom.colorInput.value = color;

    dom.colorSwatchesRow.querySelectorAll('.color-swatch-btn').forEach(btn => {
      const isMatch = btn.getAttribute('data-color') === color;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-checked', isMatch ? 'true' : 'false');
    });

    updateLiveSummary();
  }

  // =========================================================================
  // 7. Visibility Card Switching
  // =========================================================================
  function setVisibility(visibility) {
    state.visibility = visibility;
    if (visibility === 'Private') {
      dom.visPrivateRadio.checked = true;
      dom.visPrivateCard.classList.add('selected');
      dom.visTeamCard.classList.remove('selected');
    } else {
      dom.visTeamRadio.checked = true;
      dom.visTeamCard.classList.add('selected');
      dom.visPrivateCard.classList.remove('selected');
    }
    updateLiveSummary();
    updateChecklist();
  }

  // =========================================================================
  // 8. Project Lead Dropdown Management
  // =========================================================================
  function toggleLeadDropdown() {
    const isOpen = dom.leadDropdownMenu.classList.contains('active');
    if (isOpen) {
      closeLeadDropdown();
    } else {
      openLeadDropdown();
    }
  }

  function openLeadDropdown() {
    dom.leadDropdownMenu.classList.add('active');
    dom.leadSelectorBtn.classList.add('open');
    dom.leadSelectorBtn.setAttribute('aria-expanded', 'true');
    dom.leadSearchInput.focus();
  }

  function closeLeadDropdown() {
    dom.leadDropdownMenu.classList.remove('active');
    dom.leadSelectorBtn.classList.remove('open');
    dom.leadSelectorBtn.setAttribute('aria-expanded', 'false');
  }

  function renderLeadOptions() {
    const q = state.leadSearchQuery;
    const filtered = ELIGIBLE_USERS.filter(u => 
      u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      dom.leadOptionsList.innerHTML = `
        <div class="members-empty-state">No matching eligible project leads found.</div>
      `;
      return;
    }

    dom.leadOptionsList.innerHTML = filtered.map(user => {
      const isSelected = state.lead && state.lead.id === user.id;
      return `
        <div class="lead-option-row ${isSelected ? 'selected' : ''}" data-lead-id="${user.id}" role="option" aria-selected="${isSelected}">
          <div class="lead-opt-left">
            <div class="lead-avatar ${user.avClass}">${user.initials}</div>
            <div class="lead-info">
              <span class="lead-name">${user.name}</span>
              <span class="lead-role">${user.role}</span>
            </div>
          </div>
          ${isSelected ? `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ` : ''}
        </div>
      `;
    }).join('');

    // Attach click listeners
    dom.leadOptionsList.querySelectorAll('.lead-option-row').forEach(row => {
      row.addEventListener('click', () => {
        const leadId = row.getAttribute('data-lead-id');
        const user = ELIGIBLE_USERS.find(u => u.id === leadId);
        if (user) {
          selectProjectLead(user);
        }
      });
    });
  }

  function selectProjectLead(user) {
    state.lead = user;
    state.isDirty = true;
    
    // Update Button Display
    dom.leadAvatarDisplay.className = `lead-avatar ${user.avClass}`;
    dom.leadAvatarDisplay.textContent = user.initials;
    dom.leadNameDisplay.textContent = user.name;
    dom.leadRoleDisplay.textContent = user.role;
    dom.projectLeadInput.value = user.name;
    
    clearFieldError(dom.leadSelectorBtn, dom.projectLeadError);
    closeLeadDropdown();
    renderLeadOptions();
    updateLiveSummary();
    updateChecklist();
  }

  // =========================================================================
  // 9. Team Members Search & Selection
  // =========================================================================
  function renderAvailableMembers() {
    const q = state.memberSearchQuery;
    const filtered = ELIGIBLE_USERS.filter(u => 
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      dom.availableMembersList.innerHTML = `
        <div class="members-empty-state">No matching team members found in workspace.</div>
      `;
      return;
    }

    dom.availableMembersList.innerHTML = filtered.map(user => {
      const isSelected = state.selectedMembers.some(m => m.id === user.id);
      return `
        <div class="member-row" data-member-id="${user.id}">
          <div class="member-row-info">
            <div class="member-avatar ${user.avClass}">${user.initials}</div>
            <div class="member-text">
              <span class="member-name">${user.name}</span>
              <span class="member-role-email">${user.role} • ${user.email}</span>
            </div>
          </div>
          <button 
            type="button" 
            class="btn-add-member ${isSelected ? 'added' : ''}" 
            data-member-id="${user.id}"
            ${isSelected ? 'disabled' : ''}
            title="${isSelected ? 'Already invited' : 'Invite user'}"
          >
            ${isSelected ? `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Added</span>
            ` : `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Add</span>
            `}
          </button>
        </div>
      `;
    }).join('');

    // Attach listeners
    dom.availableMembersList.querySelectorAll('.btn-add-member:not(.added)').forEach(btn => {
      btn.addEventListener('click', () => {
        const memberId = btn.getAttribute('data-member-id');
        const user = ELIGIBLE_USERS.find(u => u.id === memberId);
        if (user) {
          addMember(user);
        }
      });
    });
  }

  function addMember(user) {
    if (state.selectedMembers.some(m => m.id === user.id)) return;
    state.selectedMembers.push(user);
    state.isDirty = true;

    renderAvailableMembers();
    renderSelectedMemberChips();
    updateLiveSummary();
    updateChecklist();
    showToast(`Added ${user.name} to project.`, 'success');
  }

  function removeMember(memberId) {
    const user = state.selectedMembers.find(m => m.id === memberId);
    state.selectedMembers = state.selectedMembers.filter(m => m.id !== memberId);
    state.isDirty = true;

    renderAvailableMembers();
    renderSelectedMemberChips();
    updateLiveSummary();
    updateChecklist();
    if (user) {
      showToast(`Removed ${user.name}.`, 'warning');
    }
  }

  function renderSelectedMemberChips() {
    const count = state.selectedMembers.length;
    dom.selectedCountLabel.textContent = `${count} ${count === 1 ? 'member' : 'members'} selected`;

    if (count === 0) {
      dom.selectedMembersChips.innerHTML = `
        <span class="helper-text">No team members selected yet. Use the list above to invite teammates.</span>
      `;
      return;
    }

    dom.selectedMembersChips.innerHTML = state.selectedMembers.map(user => `
      <div class="member-chip" data-chip-id="${user.id}">
        <div class="chip-avatar ${user.avClass}">${user.initials}</div>
        <div class="chip-info">
          <span class="chip-name">${user.name}</span>
          <span class="chip-role">${user.role}</span>
        </div>
        <button type="button" class="chip-remove-btn" data-remove-id="${user.id}" aria-label="Remove ${user.name}" title="Remove">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `).join('');

    // Attach remove listeners
    dom.selectedMembersChips.querySelectorAll('.chip-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-remove-id');
        removeMember(id);
      });
    });
  }

  // =========================================================================
  // 10. Date Range Validation
  // =========================================================================
  function validateDates() {
    const start = dom.startDateInput.value;
    const due = dom.dueDateInput.value;

    let isValid = true;
    clearFieldError(dom.startDateInput, dom.startDateError);
    clearFieldError(dom.dueDateInput, dom.dueDateError);

    if (!start) {
      showFieldError(dom.startDateInput, dom.startDateError, 'Start date is required.');
      isValid = false;
    }

    if (!due) {
      showFieldError(dom.dueDateInput, dom.dueDateError, 'Due date is required.');
      isValid = false;
    }

    if (start && due && due < start) {
      showFieldError(dom.dueDateInput, dom.dueDateError, 'Due date cannot be earlier than start date.');
      isValid = false;
    }

    return isValid;
  }

  // =========================================================================
  // 11. Live Project Summary Preview Sync
  // =========================================================================
  function updateLiveSummary() {
    // Project Name
    const nameText = state.projectName.trim();
    dom.previewProjectName.textContent = nameText || 'Untitled Project';

    // Description
    const descText = state.description.trim();
    dom.previewDescription.textContent = descText || 'No description provided yet. Enter goals to orient your team.';

    // Category
    const categoryInfo = CATEGORY_MAP[state.category] || { label: state.category, icon: '📁' };
    dom.previewCategoryTag.textContent = `${categoryInfo.icon} ${categoryInfo.label}`;

    // Color Badge & Hero Accent
    dom.previewColorBadge.className = `preview-color-badge color-${state.color}`;
    if (dom.previewHeroAccent) {
      dom.previewHeroAccent.className = `preview-hero-accent color-${state.color}`;
    }

    // Description & Status
    if (dom.previewDescStatus) {
      dom.previewDescStatus.textContent = descText ? 'Documented' : 'Draft';
    }

    // Visibility Tag
    if (state.visibility === 'Private') {
      dom.previewVisibilityTag.className = 'preview-visibility-tag tag-private';
      dom.previewVisibilityText.textContent = 'Private';
      dom.previewVisibilityTag.querySelector('svg').innerHTML = `
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      `;
    } else {
      dom.previewVisibilityTag.className = 'preview-visibility-tag tag-team';
      dom.previewVisibilityText.textContent = 'Team';
      dom.previewVisibilityTag.querySelector('svg').innerHTML = `
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
      `;
    }

    // Timeline Dates Format & Duration Calculation
    dom.previewTimeline.textContent = formatTimelineRange(state.startDate, state.dueDate);
    if (dom.previewDurationBadge) {
      const durationText = calculateDurationDays(state.startDate, state.dueDate);
      if (durationText) {
        dom.previewDurationBadge.textContent = durationText;
        dom.previewDurationBadge.style.display = 'inline-flex';
      } else {
        dom.previewDurationBadge.style.display = 'none';
      }
    }

    // Priority
    dom.previewPriorityBadge.className = `preview-priority-badge priority-${state.priority.toLowerCase()}`;
    dom.previewPriorityBadge.textContent = state.priority;

    // Project Lead & Role
    if (state.lead) {
      dom.previewLeadAvatar.className = `mini-avatar ${state.lead.avClass}`;
      dom.previewLeadAvatar.textContent = state.lead.initials;
      dom.previewLeadName.textContent = state.lead.name;
      if (dom.previewLeadRole) {
        dom.previewLeadRole.textContent = state.lead.role || 'Project Lead';
      }
    }

    // Selected Members Stack
    const memberCount = state.selectedMembers.length;
    dom.previewMembersCountText.textContent = `${memberCount} ${memberCount === 1 ? 'member' : 'members'} assigned`;

    if (memberCount === 0) {
      dom.previewAvatarStack.innerHTML = '';
    } else {
      const topMembers = state.selectedMembers.slice(0, 4);
      dom.previewAvatarStack.innerHTML = topMembers.map(m => `
        <div class="stack-avatar ${m.avClass}" title="${m.name}">${m.initials}</div>
      `).join('') + (memberCount > 4 ? `
        <div class="stack-avatar" style="background-color: #64748B;" title="${memberCount - 4} more">+${memberCount - 4}</div>
      ` : '');
    }
  }

  function calculateDurationDays(startStr, dueStr) {
    if (!startStr || !dueStr) return null;
    const partsStart = startStr.split('-');
    const partsDue = dueStr.split('-');
    if (partsStart.length !== 3 || partsDue.length !== 3) return null;
    const s = new Date(parseInt(partsStart[0], 10), parseInt(partsStart[1], 10) - 1, parseInt(partsStart[2], 10));
    const d = new Date(parseInt(partsDue[0], 10), parseInt(partsDue[1], 10) - 1, parseInt(partsDue[2], 10));
    const diffTime = d.getTime() - s.getTime();
    if (diffTime < 0) return null;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '1 Day' : `${diffDays} Days`;
  }

  function formatTimelineRange(startStr, dueStr) {
    if (!startStr && !dueStr) return 'Timeline not set';
    const formatDate = (str) => {
      if (!str) return '—';
      const parts = str.split('-');
      if (parts.length !== 3) return str;
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    return `${formatDate(startStr)} – ${formatDate(dueStr)}`;
  }

  // =========================================================================
  // 12. Dynamic Creation Checklist Updates
  // =========================================================================
  function updateChecklist() {
    let completedCount = 0;

    // 1. Project Name
    const hasName = state.projectName.trim().length > 0;
    setChecklistItem(dom.checkItemName, hasName);
    if (hasName) completedCount++;

    // 2. Project Lead
    const hasLead = Boolean(state.lead && state.lead.name);
    setChecklistItem(dom.checkItemLead, hasLead);
    if (hasLead) completedCount++;

    // 3. Schedule Dates
    const hasValidSchedule = Boolean(state.startDate && state.dueDate && state.dueDate >= state.startDate);
    setChecklistItem(dom.checkItemSchedule, hasValidSchedule);
    if (hasValidSchedule) completedCount++;

    // 4. Project Visibility
    const hasVisibility = Boolean(state.visibility);
    setChecklistItem(dom.checkItemVisibility, hasVisibility);
    if (hasVisibility) completedCount++;

    // 5. Team Members
    const hasMembers = state.selectedMembers.length > 0;
    setChecklistItem(dom.checkItemMembers, hasMembers);
    if (hasMembers) completedCount++;

    dom.checklistProgressText.textContent = `${completedCount} of 5 complete`;
    const progressFill = document.getElementById('checklistProgressFill');
    if (progressFill) {
      progressFill.style.width = `${Math.round((completedCount / 5) * 100)}%`;
    }

    if (dom.checklistStatusMsgText) {
      if (completedCount === 5) {
        dom.checklistStatusMsgText.textContent = '✨ Ready to create! All checklist criteria met.';
        if (dom.checklistStatusMessage) dom.checklistStatusMessage.classList.add('ready');
      } else {
        const remaining = 5 - completedCount;
        dom.checklistStatusMsgText.textContent = `${remaining} ${remaining === 1 ? 'step' : 'steps'} remaining before project launch`;
        if (dom.checklistStatusMessage) dom.checklistStatusMessage.classList.remove('ready');
      }
    }
  }

  function setChecklistItem(element, isComplete) {
    if (isComplete) {
      element.classList.add('complete');
    } else {
      element.classList.remove('complete');
    }
  }

  // =========================================================================
  // 13. Form Submission & Storage Handling
  // =========================================================================
  function handleFormSubmit() {
    // 1. Validate Project Name
    let isValid = true;
    if (!state.projectName.trim()) {
      showFieldError(dom.projectNameInput, dom.projectNameError, 'Project name is required.');
      dom.projectNameInput.focus();
      isValid = false;
    } else {
      clearFieldError(dom.projectNameInput, dom.projectNameError);
    }

    // 2. Validate Dates
    if (!validateDates()) {
      isValid = false;
    }

    // 3. Validate Lead
    if (!state.lead) {
      showFieldError(dom.leadSelectorBtn, dom.projectLeadError, 'Please select a project lead.');
      isValid = false;
    } else {
      clearFieldError(dom.leadSelectorBtn, dom.projectLeadError);
    }

    if (!isValid) {
      showToast('Please fix the highlighted errors before submitting.', 'error');
      return;
    }

    // 4. Prevent duplicate submission & show loading
    dom.submitBtn.disabled = true;
    dom.submitBtnText.textContent = 'Creating Project...';

    // 5. Send real API request
    TaskFlowAPI.createProject({
      name: state.projectName.trim(),
      description: state.description.trim(),
      department: state.category,
      color: state.color,
      start_date: state.startDate,
      due_date: state.dueDate,
      status: 'Active'
    })
      .then((createdProject) => {
        showToast(`Project "${createdProject.name}" created successfully! Redirecting...`, 'success');
        setTimeout(() => {
          window.location.href = `project-details.html?id=${createdProject.id}`;
        }, 800);
      })
      .catch((err) => {
        dom.submitBtn.disabled = false;
        dom.submitBtnText.textContent = 'Create Project';
        showToast(`Error creating project: ${err.message}`, 'error');
      });
  }

  function handleSaveDraft() {
    if (!state.projectName.trim()) {
      showFieldError(dom.projectNameInput, dom.projectNameError, 'Enter at least a project name to save a draft.');
      dom.projectNameInput.focus();
      return;
    }

    clearFieldError(dom.projectNameInput, dom.projectNameError);
    const draftData = {
      ...state,
      savedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem('taskflow_project_draft', JSON.stringify(draftData));
      state.isDirty = false;
      showToast('Project draft saved successfully.', 'success');
    } catch (e) {
      showToast('Unable to save draft to local storage.', 'error');
    }
  }

  // =========================================================================
  // 14. Cancel & Discard Changes Modal
  // =========================================================================
  function handleCancel() {
    if (state.isDirty) {
      openDiscardModal();
    } else {
      window.location.href = 'projects.html';
    }
  }

  function openDiscardModal() {
    dom.discardModalBackdrop.classList.add('active');
  }

  function closeDiscardModal() {
    dom.discardModalBackdrop.classList.remove('active');
  }

  // =========================================================================
  // 15. Helper Validation & Toast Utilities
  // =========================================================================
  function showFieldError(inputEl, errorEl, message) {
    inputEl.classList.add('input-error');
    errorEl.textContent = message;
    errorEl.classList.add('visible');
  }

  function clearFieldError(inputEl, errorEl) {
    inputEl.classList.remove('input-error');
    errorEl.textContent = '';
    errorEl.classList.remove('visible');
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
      iconSvg = '<svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <span class="toast-text">${message}</span>
    `;

    dom.toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    // Auto dismiss
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3500);
  }

  function formatReadableDate(dateStr) {
    if (!dateStr) return 'TBD';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  function formatShortDate(dateStr) {
    if (!dateStr) return 'TBD';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Run on page load
  document.addEventListener('DOMContentLoaded', init);

})();
