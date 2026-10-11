/**
 * TaskFlow — Interface 15: Settings Page
 * Script: settings.js
 * 
 * Manages full-screen settings interactions, multi-panel navigation,
 * user credentials, notification switches, live appearance theme toggles,
 * localized preferences, privacy configurations, connected app integrations,
 * and localStorage synchronization.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // =========================================================================
  // 1. Storage Keys & Initial User State
  // =========================================================================
  const STORAGE_KEYS = {
    USER_PROFILE: 'taskflow_user_profile',
    USER_AVATAR: 'taskflow_user_avatar',
    ACTIVE_WORKSPACE: 'taskflow_current_workspace',
    SETTINGS_NOTIFS: 'taskflow_settings_notifications',
    SETTINGS_APPEARANCE: 'taskflow_settings_appearance',
    SETTINGS_LOCALE: 'taskflow_settings_locale',
    SETTINGS_PRIVACY: 'taskflow_settings_privacy',
    SETTINGS_APPS: 'taskflow_settings_apps',
    THEME: 'taskflow_theme',
    TWO_FA_STATUS: 'taskflow_2fa_enabled'
  };

  const DEFAULT_USER = {
    fullName: 'Your Name',
    email: 'your.name@workspace.com',
    role: 'Product Lead',
    team: 'Design System Team',
    workspace: 'Team Workspace',
    landingPage: 'dashboard.html',
    timezone: 'UTC'
  };

  // State object
  let userProfile = { ...DEFAULT_USER };
  let currentAvatar = null;

  // Load user data
  function loadUserData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (stored) {
        userProfile = { ...DEFAULT_USER, ...JSON.parse(stored) };
      }
      currentAvatar = localStorage.getItem(STORAGE_KEYS.USER_AVATAR);
    } catch (e) {
      console.warn('Error loading stored profile:', e);
    }
  }

  loadUserData();

  // =========================================================================
  // 2. DOM Elements Cache
  // =========================================================================
  const elements = {
    // Layout & Nav
    sidebar: document.getElementById('appSidebar'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
    closeSidebarBtn: document.getElementById('closeSidebarBtn'),
    mobileHamburgerBtn: document.getElementById('mobileHamburgerBtn'),
    
    // Top Header & Sidebar User controls
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
    globalSearchInput: document.getElementById('globalSearchInput'),

    // User display elements
    sidebarAvatar: document.getElementById('sidebarAvatar'),
    sidebarUserName: document.getElementById('sidebarUserName'),
    sidebarUserRole: document.getElementById('sidebarUserRole'),
    headerAvatarDisplay: document.getElementById('headerAvatarDisplay'),
    headerAvatarInitials: document.getElementById('headerAvatarInitials'),
    headerUserName: document.getElementById('headerUserName'),
    headerUserRole: document.getElementById('headerUserRole'),
    profileMenuAvatar: document.getElementById('profileMenuAvatar'),
    profileMenuName: document.getElementById('profileMenuName'),
    profileMenuEmail: document.getElementById('profileMenuEmail'),
    headerMenuAvatar: document.getElementById('headerMenuAvatar'),
    headerMenuName: document.getElementById('headerMenuName'),
    headerMenuEmail: document.getElementById('headerMenuEmail'),
    
    // General Settings Panel
    summaryAvatar: document.getElementById('summaryAvatar'),
    summaryName: document.getElementById('summaryName'),
    summaryEmail: document.getElementById('summaryEmail'),
    summaryMeta: document.getElementById('summaryMeta'),
    generalForm: document.getElementById('generalForm'),
    generalDisplayName: document.getElementById('generalDisplayName'),
    generalEmail: document.getElementById('generalEmail'),
    generalWorkspace: document.getElementById('generalWorkspace'),
    generalLandingPage: document.getElementById('generalLandingPage'),
    generalTimezone: document.getElementById('generalTimezone'),
    btnCancelGeneral: document.getElementById('btnCancelGeneral'),
    generalSaveStatus: document.getElementById('generalSaveStatus'),
    errDisplayName: document.getElementById('errDisplayName'),
    errEmail: document.getElementById('errEmail'),

    // Account & Security Panel
    passwordForm: document.getElementById('passwordForm'),
    currentPassword: document.getElementById('currentPassword'),
    newPassword: document.getElementById('newPassword'),
    confirmPassword: document.getElementById('confirmPassword'),
    errCurrentPass: document.getElementById('errCurrentPass'),
    errNewPass: document.getElementById('errNewPass'),
    errConfirmPass: document.getElementById('errConfirmPass'),
    reqLength: document.getElementById('reqLength'),
    reqUpper: document.getElementById('reqUpper'),
    reqNumber: document.getElementById('reqNumber'),
    reqSpecial: document.getElementById('reqSpecial'),
    twoFaStatusBadge: document.getElementById('twoFaStatusBadge'),
    btnManage2FA: document.getElementById('btnManage2FA'),
    btnSignOutOtherSessions: document.getElementById('btnSignOutOtherSessions'),
    btnOpenDeleteModal: document.getElementById('btnOpenDeleteModal'),

    // Modals
    twoFaModal: document.getElementById('twoFaModal'),
    close2FaModalBtn: document.getElementById('close2FaModalBtn'),
    btnCancel2FA: document.getElementById('btnCancel2FA'),
    btnVerify2FA: document.getElementById('btnVerify2FA'),
    twoFaVerificationCode: document.getElementById('twoFaVerificationCode'),
    err2FaCode: document.getElementById('err2FaCode'),
    btnCopySecretKey: document.getElementById('btnCopySecretKey'),

    deleteAccountModal: document.getElementById('deleteAccountModal'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    btnCancelDelete: document.getElementById('btnCancelDelete'),
    btnConfirmDelete: document.getElementById('btnConfirmDelete'),
    deleteConfirmationInput: document.getElementById('deleteConfirmationInput'),
    errDeleteConfirm: document.getElementById('errDeleteConfirm'),

    // Notifications
    btnSaveNotifs: document.getElementById('btnSaveNotifs'),
    btnResetNotifs: document.getElementById('btnResetNotifs'),

    // Appearance
    btnSaveAppearance: document.getElementById('btnSaveAppearance'),
    appearanceSaveStatus: document.getElementById('appearanceSaveStatus'),
    toggleReducedMotion: document.getElementById('toggleReducedMotion'),
    toggleHighContrast: document.getElementById('toggleHighContrast'),

    // Language & Region
    languageForm: document.getElementById('languageForm'),
    selectLanguage: document.getElementById('selectLanguage'),
    selectDateFormat: document.getElementById('selectDateFormat'),
    selectFirstDay: document.getElementById('selectFirstDay'),

    // Privacy
    privacyForm: document.getElementById('privacyForm'),
    selectProfileVisibility: document.getElementById('selectProfileVisibility'),
    selectProjectInvites: document.getElementById('selectProjectInvites'),
    selectContactVisibility: document.getElementById('selectContactVisibility'),
    toggleActivityFeed: document.getElementById('toggleActivityFeed'),
    toggleSearchDiscoverable: document.getElementById('toggleSearchDiscoverable'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // Helper to extract initials
  function getInitials(name) {
    if (!name) return 'YB';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  // =========================================================================
  // 3. Render User Profile Information across Interface
  // =========================================================================
  function renderUserInfo() {
    const name = userProfile.fullName || 'Your Name';
    const email = userProfile.email || 'your.name@workspace.com';
    const role = userProfile.role || 'Product Lead';
    const team = userProfile.team || 'Design System Team';
    const initials = getInitials(name);

    // Sidebar
    if (elements.sidebarUserName) elements.sidebarUserName.textContent = name;
    if (elements.sidebarUserRole) elements.sidebarUserRole.textContent = role;
    if (elements.profileMenuName) elements.profileMenuName.textContent = name;
    if (elements.profileMenuEmail) elements.profileMenuEmail.textContent = email;

    // Header
    if (elements.headerUserName) elements.headerUserName.textContent = name;
    if (elements.headerUserRole) elements.headerUserRole.textContent = role;
    if (elements.headerMenuName) elements.headerMenuName.textContent = name;
    if (elements.headerMenuEmail) elements.headerMenuEmail.textContent = email;

    // General Summary Card
    if (elements.summaryName) elements.summaryName.textContent = name;
    if (elements.summaryEmail) elements.summaryEmail.textContent = email;
    if (elements.summaryMeta) elements.summaryMeta.textContent = `${role} • ${team}`;

    // Avatars
    const avatarNodes = [
      elements.sidebarAvatar,
      elements.profileMenuAvatar,
      elements.headerMenuAvatar,
      elements.summaryAvatar
    ];

    avatarNodes.forEach(node => {
      if (!node) return;
      if (currentAvatar) {
        node.style.backgroundImage = `url("${currentAvatar}")`;
        node.textContent = '';
      } else {
        node.style.backgroundImage = 'none';
        node.textContent = initials;
      }
    });

    if (elements.headerAvatarDisplay) {
      if (currentAvatar) {
        elements.headerAvatarDisplay.style.backgroundImage = `url("${currentAvatar}")`;
        if (elements.headerAvatarInitials) elements.headerAvatarInitials.textContent = '';
      } else {
        elements.headerAvatarDisplay.style.backgroundImage = 'none';
        if (elements.headerAvatarInitials) elements.headerAvatarInitials.textContent = initials;
      }
    }

    // Populate General Form inputs
    if (elements.generalDisplayName) elements.generalDisplayName.value = name;
    if (elements.generalEmail) elements.generalEmail.value = email;
    if (elements.generalWorkspace && userProfile.workspace) {
      elements.generalWorkspace.value = userProfile.workspace;
    }
    if (elements.generalLandingPage && userProfile.landingPage) {
      elements.generalLandingPage.value = userProfile.landingPage;
    }
    if (elements.generalTimezone && userProfile.timezone) {
      elements.generalTimezone.value = userProfile.timezone;
    }
  }

  renderUserInfo();

  // =========================================================================
  // 4. Dropdowns & Global Listeners
  // =========================================================================
  function closeAllDropdowns() {
    if (elements.workspaceDropdown) elements.workspaceDropdown.classList.remove('show');
    if (elements.profileDropdown) elements.profileDropdown.classList.remove('show');
    if (elements.headerProfileDropdown) elements.headerProfileDropdown.classList.remove('show');
    if (elements.helpDropdown) elements.helpDropdown.classList.remove('show');
  }

  // Workspace trigger
  if (elements.workspaceBtn && elements.workspaceDropdown) {
    elements.workspaceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = elements.workspaceDropdown.classList.contains('show');
      closeAllDropdowns();
      if (!isOpen) elements.workspaceDropdown.classList.add('show');
    });
  }

  // Workspace switch actions
  document.querySelectorAll('.ws-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.ws-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      const wsName = item.getAttribute('data-workspace');
      const wsAvatar = item.getAttribute('data-avatar');
      if (elements.currentWorkspaceName) elements.currentWorkspaceName.textContent = wsName;
      if (elements.currentWorkspaceAvatar) elements.currentWorkspaceAvatar.textContent = wsAvatar;
      if (elements.generalWorkspace) elements.generalWorkspace.value = wsName;
      userProfile.workspace = wsName;
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile));
      closeAllDropdowns();
      showToast(`Switched active workspace to "${wsName}"`, 'info');
    });
  });

  // Sidebar user profile trigger
  if (elements.profileBtn && elements.profileDropdown) {
    elements.profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = elements.profileDropdown.classList.contains('show');
      closeAllDropdowns();
      if (!isOpen) elements.profileDropdown.classList.add('show');
    });
  }

  // Header user avatar trigger
  if (elements.headerAvatarBtn && elements.headerProfileDropdown) {
    elements.headerAvatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = elements.headerProfileDropdown.classList.contains('show');
      closeAllDropdowns();
      if (!isOpen) elements.headerProfileDropdown.classList.add('show');
    });
  }

  // Help header trigger
  if (elements.helpHeaderBtn && elements.helpDropdown) {
    elements.helpHeaderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = elements.helpDropdown.classList.contains('show');
      closeAllDropdowns();
      if (!isOpen) elements.helpDropdown.classList.add('show');
    });
  }

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    closeAllDropdowns();
  });

  // Mobile sidebar drawer
  if (elements.mobileHamburgerBtn && elements.sidebar) {
    elements.mobileHamburgerBtn.addEventListener('click', () => {
      elements.sidebar.classList.add('open');
      if (elements.sidebarBackdrop) elements.sidebarBackdrop.classList.add('show');
    });
  }

  function closeMobileSidebar() {
    if (elements.sidebar) elements.sidebar.classList.remove('open');
    if (elements.sidebarBackdrop) elements.sidebarBackdrop.classList.remove('show');
  }

  if (elements.closeSidebarBtn) {
    elements.closeSidebarBtn.addEventListener('click', closeMobileSidebar);
  }
  if (elements.sidebarBackdrop) {
    elements.sidebarBackdrop.addEventListener('click', closeMobileSidebar);
  }

  // Global search shortcut (Ctrl+K)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (elements.globalSearchInput) {
        elements.globalSearchInput.focus();
        elements.globalSearchInput.select();
      }
    }
  });

  // =========================================================================
  // 5. Settings Category Multi-Panel Navigation
  // =========================================================================
  const menuButtons = document.querySelectorAll('.settings-menu-btn');
  const sections = document.querySelectorAll('.settings-section');

  function switchSection(sectionId) {
    // Update active button
    menuButtons.forEach(btn => {
      if (btn.getAttribute('data-section') === sectionId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update active panel
    sections.forEach(sec => {
      if (sec.id === `panel${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}`) {
        sec.classList.add('active');
      } else {
        sec.classList.remove('active');
      }
    });

    // Update URL hash safely without jump
    if (history.replaceState) {
      history.replaceState(null, null, `#${sectionId}`);
    }
  }

  menuButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-section');
      switchSection(target);
    });
  });

  // Check URL hash on load (e.g. #security, #notifications)
  const initialHash = window.location.hash.replace('#', '').toLowerCase();
  const validSections = ['general', 'security', 'notifications', 'appearance', 'language', 'privacy', 'apps'];
  if (validSections.includes(initialHash)) {
    switchSection(initialHash);
  }

  // =========================================================================
  // 6. Section 1: General Settings Handler
  // =========================================================================
  if (elements.generalForm) {
    elements.generalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      let isValid = true;
      const nameVal = elements.generalDisplayName.value.trim();
      const emailVal = elements.generalEmail.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Validate name
      if (!nameVal) {
        elements.generalDisplayName.parentElement.classList.add('has-error');
        isValid = false;
      } else {
        elements.generalDisplayName.parentElement.classList.remove('has-error');
      }

      // Validate email
      if (!emailVal || !emailRegex.test(emailVal)) {
        elements.generalEmail.parentElement.classList.add('has-error');
        isValid = false;
      } else {
        elements.generalEmail.parentElement.classList.remove('has-error');
      }

      if (!isValid) return;

      // Update state and persist
      userProfile.fullName = nameVal;
      userProfile.email = emailVal;
      userProfile.workspace = elements.generalWorkspace.value;
      userProfile.landingPage = elements.generalLandingPage.value;
      userProfile.timezone = elements.generalTimezone.value;

      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile));

      if (typeof TaskFlowAPI !== 'undefined' && TaskFlowAPI.isAuthenticated()) {
        TaskFlowAPI.updateProfile({ full_name: nameVal }).catch(console.warn);
        TaskFlowAPI.updateSettings({
          workspace_name: elements.generalWorkspace.value,
          timezone: elements.generalTimezone.value
        }).catch(console.warn);
      }

      // Refresh displayed names across header and cards
      renderUserInfo();

      if (elements.generalSaveStatus) {
        elements.generalSaveStatus.textContent = 'Changes saved just now';
        setTimeout(() => {
          elements.generalSaveStatus.textContent = 'All changes saved';
        }, 3000);
      }

      showToast('General account preferences saved successfully!', 'success');
    });

    // Cancel Button
    if (elements.btnCancelGeneral) {
      elements.btnCancelGeneral.addEventListener('click', () => {
        loadUserData();
        renderUserInfo();
        elements.generalDisplayName.parentElement.classList.remove('has-error');
        elements.generalEmail.parentElement.classList.remove('has-error');
        showToast('Changes discarded.', 'info');
      });
    }
  }

  // =========================================================================
  // 7. Section 2: Account & Security Handlers
  // =========================================================================
  
  // Password Visibility Toggles
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `<svg class="eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
      } else {
        input.type = 'password';
        btn.innerHTML = `<svg class="eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      }
    });
  });

  // Real-time password requirement tracker
  if (elements.newPassword) {
    elements.newPassword.addEventListener('input', () => {
      const val = elements.newPassword.value;
      
      const hasLength = val.length >= 8;
      const hasUpper = /[A-Z]/.test(val);
      const hasNumber = /[0-9]/.test(val);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(val);

      toggleRequirement(elements.reqLength, hasLength);
      toggleRequirement(elements.reqUpper, hasUpper);
      toggleRequirement(elements.reqNumber, hasNumber);
      toggleRequirement(elements.reqSpecial, hasSpecial);
    });
  }

  function toggleRequirement(el, isMet) {
    if (!el) return;
    if (isMet) {
      el.classList.add('met');
    } else {
      el.classList.remove('met');
    }
  }

  // Change Password Form
  if (elements.passwordForm) {
    elements.passwordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      let isValid = true;
      const currentVal = elements.currentPassword.value;
      const newVal = elements.newPassword.value;
      const confirmVal = elements.confirmPassword.value;

      // Current pass
      if (!currentVal) {
        elements.currentPassword.closest('.form-group').classList.add('has-error');
        isValid = false;
      } else {
        elements.currentPassword.closest('.form-group').classList.remove('has-error');
      }

      // New pass requirements
      const hasLength = newVal.length >= 8;
      const hasUpper = /[A-Z]/.test(newVal);
      const hasNumber = /[0-9]/.test(newVal);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newVal);

      if (!hasLength || !hasUpper || !hasNumber || !hasSpecial) {
        elements.newPassword.closest('.form-group').classList.add('has-error');
        isValid = false;
      } else {
        elements.newPassword.closest('.form-group').classList.remove('has-error');
      }

      // Confirm pass
      if (!confirmVal || confirmVal !== newVal) {
        elements.confirmPassword.closest('.form-group').classList.add('has-error');
        isValid = false;
      } else {
        elements.confirmPassword.closest('.form-group').classList.remove('has-error');
      }

      if (!isValid) return;

      // Backend password update via TaskFlowAPI
      const submitBtn = elements.securityForm ? elements.securityForm.querySelector('button[type="submit"]') : null;
      if (submitBtn) submitBtn.disabled = true;

      try {
        if (typeof TaskFlowAPI !== 'undefined' && TaskFlowAPI.isAuthenticated()) {
          await TaskFlowAPI.changePassword(currentVal, newVal, confirmVal);
        }
        elements.currentPassword.value = '';
        elements.newPassword.value = '';
        elements.confirmPassword.value = '';

        [elements.reqLength, elements.reqUpper, elements.reqNumber, elements.reqSpecial].forEach(el => {
          if (el) el.classList.remove('met');
        });

        showToast('Your password has been changed securely!', 'success');
      } catch (err) {
        showToast('Error changing password: ' + (err.message || 'Error'), 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Two-Factor Authentication Modal Management
  const is2FaEnabled = localStorage.getItem(STORAGE_KEYS.TWO_FA_STATUS) === 'true';
  function update2FaBadge(enabled) {
    if (!elements.twoFaStatusBadge) return;
    if (enabled) {
      elements.twoFaStatusBadge.textContent = 'Active • TOTP';
      elements.twoFaStatusBadge.className = 'status-chip chip-active';
      if (elements.btnManage2FA) elements.btnManage2FA.textContent = 'Manage 2FA';
    } else {
      elements.twoFaStatusBadge.textContent = 'Disabled';
      elements.twoFaStatusBadge.className = 'status-chip chip-gray';
      if (elements.btnManage2FA) elements.btnManage2FA.textContent = 'Configure 2FA';
    }
  }

  update2FaBadge(is2FaEnabled);

  if (elements.btnManage2FA && elements.twoFaModal) {
    elements.btnManage2FA.addEventListener('click', () => {
      elements.twoFaModal.classList.add('show');
      if (elements.twoFaVerificationCode) {
        elements.twoFaVerificationCode.value = '';
        elements.twoFaVerificationCode.closest('.form-group').classList.remove('has-error');
        elements.twoFaVerificationCode.focus();
      }
    });
  }

  function close2FaModal() {
    if (elements.twoFaModal) elements.twoFaModal.classList.remove('show');
  }

  if (elements.close2FaModalBtn) elements.close2FaModalBtn.addEventListener('click', close2FaModal);
  if (elements.btnCancel2FA) elements.btnCancel2FA.addEventListener('click', close2FaModal);

  // Copy Secret Key
  if (elements.btnCopySecretKey) {
    elements.btnCopySecretKey.addEventListener('click', () => {
      navigator.clipboard.writeText('TASK-FLOW-8X92-SECURE-KEY').then(() => {
        showToast('Secret key copied to clipboard!', 'info');
      }).catch(() => {
        showToast('Key copied: TASK-FLOW-8X92-SECURE-KEY', 'info');
      });
    });
  }

  // Verify and Enable 2FA
  if (elements.btnVerify2FA) {
    elements.btnVerify2FA.addEventListener('click', () => {
      const code = elements.twoFaVerificationCode.value.trim();
      if (!/^\d{6}$/.test(code)) {
        elements.twoFaVerificationCode.closest('.form-group').classList.add('has-error');
        return;
      }
      elements.twoFaVerificationCode.closest('.form-group').classList.remove('has-error');
      localStorage.setItem(STORAGE_KEYS.TWO_FA_STATUS, 'true');
      update2FaBadge(true);
      close2FaModal();
      showToast('Two-Factor Authentication is now enabled on your account!', 'success');
    });
  }

  // Sign out other sessions
  if (elements.btnSignOutOtherSessions) {
    elements.btnSignOutOtherSessions.addEventListener('click', () => {
      const otherSessions = document.querySelectorAll('.other-session');
      otherSessions.forEach(el => el.remove());
      showToast('Successfully terminated 2 other active sessions.', 'success');
    });
  }

  // Delete Account Modal
  if (elements.btnOpenDeleteModal && elements.deleteAccountModal) {
    elements.btnOpenDeleteModal.addEventListener('click', () => {
      elements.deleteAccountModal.classList.add('show');
      if (elements.deleteConfirmationInput) {
        elements.deleteConfirmationInput.value = '';
        elements.deleteConfirmationInput.closest('.form-group').classList.remove('has-error');
        elements.btnConfirmDelete.disabled = true;
        elements.deleteConfirmationInput.focus();
      }
    });
  }

  function closeDeleteModal() {
    if (elements.deleteAccountModal) elements.deleteAccountModal.classList.remove('show');
  }

  if (elements.closeDeleteModalBtn) elements.closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
  if (elements.btnCancelDelete) elements.btnCancelDelete.addEventListener('click', closeDeleteModal);

  if (elements.deleteConfirmationInput) {
    elements.deleteConfirmationInput.addEventListener('input', () => {
      const val = elements.deleteConfirmationInput.value.trim();
      if (val === 'DELETE') {
        elements.btnConfirmDelete.disabled = false;
        elements.deleteConfirmationInput.closest('.form-group').classList.remove('has-error');
      } else {
        elements.btnConfirmDelete.disabled = true;
      }
    });
  }

  if (elements.btnConfirmDelete) {
    elements.btnConfirmDelete.addEventListener('click', () => {
      closeDeleteModal();
      showToast('Account marked for deletion. Redirecting...', 'error');
      setTimeout(() => {
        window.location.href = 'register.html';
      }, 1500);
    });
  }

  // =========================================================================
  // 8. Section 3: Notification Preferences Handlers
  // =========================================================================
  // Load saved notifs
  function loadNotificationSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS_NOTIFS);
      if (saved) {
        const notifs = JSON.parse(saved);
        if (notifs.emailAssign !== undefined) document.getElementById('toggleEmailAssign').checked = notifs.emailAssign;
        if (notifs.emailDue !== undefined) document.getElementById('toggleEmailDue').checked = notifs.emailDue;
        if (notifs.emailMentions !== undefined) document.getElementById('toggleEmailMentions').checked = notifs.emailMentions;
        if (notifs.emailProjects !== undefined) document.getElementById('toggleEmailProjects').checked = notifs.emailProjects;
        if (notifs.emailWeekly !== undefined) document.getElementById('toggleEmailWeekly').checked = notifs.emailWeekly;
        if (notifs.appAssign !== undefined) document.getElementById('toggleAppAssign').checked = notifs.appAssign;
        if (notifs.appStatus !== undefined) document.getElementById('toggleAppStatus').checked = notifs.appStatus;
        if (notifs.appComments !== undefined) document.getElementById('toggleAppComments').checked = notifs.appComments;
        if (notifs.appInvites !== undefined) document.getElementById('toggleAppInvites').checked = notifs.appInvites;
        if (notifs.appTeam !== undefined) document.getElementById('toggleAppTeam').checked = notifs.appTeam;
        if (notifs.frequency) {
          const radio = document.querySelector(`input[name="notifFrequency"][value="${notifs.frequency}"]`);
          if (radio) {
            radio.checked = true;
            document.querySelectorAll('.radio-pill-card').forEach(c => c.classList.remove('active'));
            radio.closest('.radio-pill-card').classList.add('active');
          }
        }
      }
    } catch (e) {
      console.warn('Error loading notifications:', e);
    }
  }

  loadNotificationSettings();

  // Frequency pill select
  document.querySelectorAll('.radio-pill-card input').forEach(input => {
    input.addEventListener('change', () => {
      document.querySelectorAll('.radio-pill-card').forEach(c => c.classList.remove('active'));
      input.closest('.radio-pill-card').classList.add('active');
    });
  });

  if (elements.btnSaveNotifs) {
    elements.btnSaveNotifs.addEventListener('click', () => {
      const freqRadio = document.querySelector('input[name="notifFrequency"]:checked');
      const settings = {
        emailAssign: document.getElementById('toggleEmailAssign').checked,
        emailDue: document.getElementById('toggleEmailDue').checked,
        emailMentions: document.getElementById('toggleEmailMentions').checked,
        emailProjects: document.getElementById('toggleEmailProjects').checked,
        emailWeekly: document.getElementById('toggleEmailWeekly').checked,
        appAssign: document.getElementById('toggleAppAssign').checked,
        appStatus: document.getElementById('toggleAppStatus').checked,
        appComments: document.getElementById('toggleAppComments').checked,
        appInvites: document.getElementById('toggleAppInvites').checked,
        appTeam: document.getElementById('toggleAppTeam').checked,
        frequency: freqRadio ? freqRadio.value : 'immediately'
      };

      localStorage.setItem(STORAGE_KEYS.SETTINGS_NOTIFS, JSON.stringify(settings));
      showToast('Notification preferences successfully saved!', 'success');
    });
  }

  if (elements.btnResetNotifs) {
    elements.btnResetNotifs.addEventListener('click', () => {
      document.getElementById('toggleEmailAssign').checked = true;
      document.getElementById('toggleEmailDue').checked = true;
      document.getElementById('toggleEmailMentions').checked = true;
      document.getElementById('toggleEmailProjects').checked = false;
      document.getElementById('toggleEmailWeekly').checked = true;
      document.getElementById('toggleAppAssign').checked = true;
      document.getElementById('toggleAppStatus').checked = true;
      document.getElementById('toggleAppComments').checked = true;
      document.getElementById('toggleAppInvites').checked = true;
      document.getElementById('toggleAppTeam').checked = false;

      const imm = document.querySelector('input[name="notifFrequency"][value="immediately"]');
      if (imm) {
        imm.checked = true;
        document.querySelectorAll('.radio-pill-card').forEach(c => c.classList.remove('active'));
        imm.closest('.radio-pill-card').classList.add('active');
      }

      showToast('Notification preferences restored to defaults.', 'info');
    });
  }

  // =========================================================================
  // 9. Section 4: Appearance & Live Theme Engine
  // =========================================================================
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  applyTheme(savedTheme);

  // Mark active theme card
  const themeCard = document.querySelector(`.theme-card[data-theme="${savedTheme}"]`);
  if (themeCard) {
    document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
    themeCard.classList.add('active');
    const radio = themeCard.querySelector('input');
    if (radio) radio.checked = true;
  }

  // Theme selection change
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input');
      if (radio) radio.checked = true;
      const themeVal = card.getAttribute('data-theme');
      applyTheme(themeVal);
      localStorage.setItem(STORAGE_KEYS.THEME, themeVal);
      showToast(`Interface theme switched to ${card.querySelector('.theme-name').textContent}`, 'info');
    });
  });

  // Density Cards
  document.querySelectorAll('.density-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.density-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input');
      if (radio) radio.checked = true;
      const density = card.getAttribute('data-density');
      if (density === 'compact') {
        document.body.setAttribute('data-density', 'compact');
      } else {
        document.body.removeAttribute('data-density');
      }
    });
  });

  if (elements.btnSaveAppearance) {
    elements.btnSaveAppearance.addEventListener('click', () => {
      const selectedTheme = document.querySelector('.theme-card.active')?.getAttribute('data-theme') || 'light';
      const selectedDensity = document.querySelector('.density-card.active')?.getAttribute('data-density') || 'comfortable';
      
      const appearanceData = {
        theme: selectedTheme,
        density: selectedDensity,
        reducedMotion: elements.toggleReducedMotion.checked,
        highContrast: elements.toggleHighContrast.checked
      };

      localStorage.setItem(STORAGE_KEYS.SETTINGS_APPEARANCE, JSON.stringify(appearanceData));
      showToast('Appearance settings saved!', 'success');
    });
  }

  // =========================================================================
  // 10. Section 5: Language & Region
  // =========================================================================
  if (elements.languageForm) {
    elements.languageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const localeData = {
        language: elements.selectLanguage.value,
        dateFormat: elements.selectDateFormat.value,
        timeFormat: document.querySelector('input[name="timeFormatOption"]:checked')?.value || '12h',
        firstDay: elements.selectFirstDay.value
      };

      localStorage.setItem(STORAGE_KEYS.SETTINGS_LOCALE, JSON.stringify(localeData));
      showToast('Regional preferences updated successfully!', 'success');
    });
  }

  // =========================================================================
  // 11. Section 6: Privacy
  // =========================================================================
  if (elements.privacyForm) {
    elements.privacyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const privacyData = {
        profileVisibility: elements.selectProfileVisibility.value,
        projectInvites: elements.selectProjectInvites.value,
        contactVisibility: elements.selectContactVisibility.value,
        activityFeed: elements.toggleActivityFeed.checked,
        searchDiscoverable: elements.toggleSearchDiscoverable.checked
      };

      localStorage.setItem(STORAGE_KEYS.SETTINGS_PRIVACY, JSON.stringify(privacyData));
      showToast('Privacy and visibility settings saved!', 'success');
    });
  }

  // =========================================================================
  // 12. Section 7: Connected Apps Integrations
  // =========================================================================
  // Disconnect handler
  document.querySelectorAll('.btn-disconnect').forEach(btn => {
    btn.addEventListener('click', () => {
      const appItem = btn.closest('.integration-item');
      const appName = appItem.querySelector('.app-name').textContent;
      
      // Update badge
      const badge = appItem.querySelector('.status-chip');
      badge.textContent = 'Not Connected';
      badge.className = 'status-chip chip-gray';

      // Switch button
      btn.textContent = 'Connect App';
      btn.className = 'btn-primary btn-sm btn-connect';
      
      showToast(`Disconnected ${appName} integration.`, 'info');
    });
  });

  // Connect handler
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-connect')) {
      const btn = e.target;
      const appItem = btn.closest('.integration-item');
      const appName = appItem.querySelector('.app-name').textContent;

      // Update badge
      const badge = appItem.querySelector('.status-chip');
      badge.textContent = 'Connected';
      badge.className = 'status-chip chip-active';

      // Switch button
      btn.textContent = 'Disconnect';
      btn.className = 'btn-secondary btn-sm btn-disconnect';

      showToast(`Successfully connected and authenticated with ${appName}!`, 'success');
    }
  });

  // Log out buttons
  const handleLogout = () => {
    showToast('Signing out of TaskFlow...', 'info');
    if (typeof TaskFlowAPI !== 'undefined') {
      TaskFlowAPI.logout();
    } else {
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 500);
    }
  };

  const logoutSidebar = document.getElementById('logoutSidebarBtn');
  const logoutHeader = document.getElementById('logoutHeaderBtn');
  if (logoutSidebar) logoutSidebar.addEventListener('click', handleLogout);
  if (logoutHeader) logoutHeader.addEventListener('click', handleLogout);

  // =========================================================================
  // 13. Toast Notification Helper
  // =========================================================================
  function showToast(message, type = 'info', duration = 3500) {
    if (!elements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <span>${message}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  // Load live settings from API
  async function fetchSettingsFromAPI() {
    if (typeof TaskFlowAPI === 'undefined' || !TaskFlowAPI.isAuthenticated()) return;
    try {
      const [profile, settings] = await Promise.all([
        TaskFlowAPI.getProfile(),
        TaskFlowAPI.getSettings()
      ]);
      if (profile) {
        userProfile.fullName = profile.full_name || profile.email;
        userProfile.email = profile.email;
        userProfile.role = profile.job_title || profile.role || 'Product Lead';
        renderUserInfo();
      }
      if (settings && elements.generalWorkspace) {
        if (settings.workspace_name) elements.generalWorkspace.value = settings.workspace_name;
        if (settings.timezone) elements.generalTimezone.value = settings.timezone;
      }
    } catch (e) {
      console.warn('Could not fetch settings from API:', e);
    }
  }

  fetchSettingsFromAPI();
});
