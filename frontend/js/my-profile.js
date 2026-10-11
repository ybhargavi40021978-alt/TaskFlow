/**
 * TaskFlow — Interface 14: My Profile Page
 * Script: my-profile.js
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. Initial State & Storage Keys
  // =========================================================================

  const STORAGE_KEY_PROFILE = 'taskflow_user_profile';
  const STORAGE_KEY_AVATAR = 'taskflow_user_avatar';
  const STORAGE_KEY_WORKSPACE = 'taskflow_current_workspace';
  const STORAGE_KEY_MEMBERS = 'taskflow_team_members';

  // Default User Profile Model
  let userProfile = {
    name: 'Your Name',
    email: 'your.name@workspace.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA',
    role: 'Product Lead',
    department: 'Product & Design',
    about: 'Product strategist and engineering collaborator with 8+ years of SaaS leadership experience. Passionate about design systems, agile execution, and building high-impact collaborative workspaces for distributed cross-functional teams.',
    initials: 'YB'
  };

  // Saved user avatar data URL
  let userAvatarDataUrl = null;

  // Edit Mode Flag
  let isEditMode = false;

  // Staged avatar for photo modal
  let stagedAvatarDataUrl = null;

  // Task Statistics Model
  const taskStats = {
    total: 18,
    inProgress: 3,
    completed: 14,
    overdue: 1
  };

  // Load from LocalStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (saved) {
      userProfile = Object.assign(userProfile, JSON.parse(saved));
    }
    const savedAvatar = localStorage.getItem(STORAGE_KEY_AVATAR);
    if (savedAvatar) {
      userAvatarDataUrl = savedAvatar;
    }
  } catch (e) {
    console.warn('Error reading from localStorage', e);
  }

  // Ensure Initials
  updateInitials();

  function updateInitials() {
    const parts = (userProfile.name || 'Your Name').trim().split(/\s+/);
    userProfile.initials = parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (parts[0].slice(0, 2)).toUpperCase();
  }

  function saveProfileToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(userProfile));
      // Also update team members directory current user record
      const membersRaw = localStorage.getItem(STORAGE_KEY_MEMBERS);
      if (membersRaw) {
        const members = JSON.parse(membersRaw);
        const curr = members.find(m => m.isCurrentUser);
        if (curr) {
          curr.name = userProfile.name;
          curr.email = userProfile.email;
          curr.role = userProfile.role;
          curr.initials = userProfile.initials;
          localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
        }
      }
    } catch (e) {
      console.error('Failed to save profile to localStorage', e);
    }
  }

  // =========================================================================
  // 2. DOM Elements
  // =========================================================================

  // Mode Buttons & Indicators
  const toggleEditModeBtn = document.getElementById('toggleEditModeBtn');
  const toggleEditBtnText = document.getElementById('toggleEditBtnText');
  const cancelEditHeaderBtn = document.getElementById('cancelEditHeaderBtn');
  const cancelEditBottomBtn = document.getElementById('cancelEditBottomBtn');
  const discardChangesBtn = document.getElementById('discardChangesBtn');
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const bottomActionsBar = document.getElementById('bottomActionsBar');
  const modeIndicatorPill = document.getElementById('modeIndicatorPill');
  const aboutCharCounter = document.getElementById('aboutCharCounter');

  // Profile Form & Fields
  const profileForm = document.getElementById('profileForm');
  const inputFullName = document.getElementById('inputFullName');
  const inputEmail = document.getElementById('inputEmail');
  const inputPhone = document.getElementById('inputPhone');
  const inputLocation = document.getElementById('inputLocation');
  const inputJobTitle = document.getElementById('inputJobTitle');
  const inputDepartment = document.getElementById('inputDepartment');
  const inputAbout = document.getElementById('inputAbout');

  // View Mode Elements
  const viewFullName = document.getElementById('viewFullName');
  const viewEmail = document.getElementById('viewEmail');
  const viewPhone = document.getElementById('viewPhone');
  const viewLocation = document.getElementById('viewLocation');
  const viewJobTitle = document.getElementById('viewJobTitle');
  const viewDepartment = document.getElementById('viewDepartment');
  const viewAbout = document.getElementById('viewAbout');

  // Validation Errors
  const errFullName = document.getElementById('errFullName');
  const errEmail = document.getElementById('errEmail');
  const errPhone = document.getElementById('errPhone');

  // Profile Overview Card Elements
  const overviewName = document.getElementById('overviewName');
  const overviewJobTitle = document.getElementById('overviewJobTitle');
  const overviewEmail = document.getElementById('overviewEmail');
  const overviewLocationText = document.getElementById('overviewLocationText');
  const overviewTeamText = document.getElementById('overviewTeamText');
  const overviewAvatarInitials = document.getElementById('overviewAvatarInitials');
  const overviewAvatarImg = document.getElementById('overviewAvatarImg');
  const openAvatarModalBtn = document.getElementById('openAvatarModalBtn');

  // Work Information Display
  const workTeamVal = document.getElementById('workTeamVal');
  const workActiveWorkspace = document.getElementById('workActiveWorkspace');

  // Task Overview Elements
  const taskStatTotal = document.getElementById('taskStatTotal');
  const taskStatProgress = document.getElementById('taskStatProgress');
  const taskStatCompleted = document.getElementById('taskStatCompleted');
  const taskStatOverdue = document.getElementById('taskStatOverdue');
  const completionRatioText = document.getElementById('completionRatioText');
  const progressFillBar = document.getElementById('progressFillBar');
  const progressSubCaption = document.getElementById('progressSubCaption');

  // Avatar Modal Elements
  const avatarModalBackdrop = document.getElementById('avatarModalBackdrop');
  const closeAvatarModalBtn = document.getElementById('closeAvatarModalBtn');
  const cancelAvatarModalBtn = document.getElementById('cancelAvatarModalBtn');
  const saveAvatarPhotoBtn = document.getElementById('saveAvatarPhotoBtn');
  const removeAvatarPhotoBtn = document.getElementById('removeAvatarPhotoBtn');
  const uploadDropzone = document.getElementById('uploadDropzone');
  const avatarFileInput = document.getElementById('avatarFileInput');
  const modalPreviewInitials = document.getElementById('modalPreviewInitials');
  const modalPreviewImg = document.getElementById('modalPreviewImg');
  const avatarFileError = document.getElementById('avatarFileError');

  // Discard Confirmation Modal
  const discardModalBackdrop = document.getElementById('discardModalBackdrop');
  const keepEditingBtn = document.getElementById('keepEditingBtn');
  const confirmDiscardBtn = document.getElementById('confirmDiscardBtn');

  // Toast Container
  const toastContainer = document.getElementById('toastContainer');

  // =========================================================================
  // 3. Render Profile & UI State
  // =========================================================================

  function renderProfileView() {
    // 1. Overview Card
    if (overviewName) overviewName.textContent = userProfile.name;
    if (overviewJobTitle) overviewJobTitle.textContent = userProfile.role;
    if (overviewEmail) overviewEmail.textContent = userProfile.email;
    if (overviewLocationText) overviewLocationText.textContent = userProfile.location || 'Not specified';
    if (overviewTeamText) overviewTeamText.textContent = (userProfile.department || 'Product & Design') + ' Team';
    if (overviewAvatarInitials) overviewAvatarInitials.textContent = userProfile.initials;

    // Avatar Image in Overview
    if (userAvatarDataUrl) {
      if (overviewAvatarImg) {
        overviewAvatarImg.src = userAvatarDataUrl;
        overviewAvatarImg.style.display = 'block';
      }
      if (overviewAvatarInitials) overviewAvatarInitials.style.display = 'none';
    } else {
      if (overviewAvatarImg) overviewAvatarImg.style.display = 'none';
      if (overviewAvatarInitials) overviewAvatarInitials.style.display = 'block';
    }

    // 2. Personal Information (View Mode Elements)
    if (viewFullName) viewFullName.textContent = userProfile.name;
    if (viewEmail) viewEmail.textContent = userProfile.email;
    if (viewPhone) viewPhone.textContent = userProfile.phone || 'None provided';
    if (viewLocation) viewLocation.textContent = userProfile.location || 'Not specified';
    if (viewJobTitle) viewJobTitle.textContent = userProfile.role;
    if (viewDepartment) viewDepartment.textContent = userProfile.department || 'None';
    if (viewAbout) viewAbout.textContent = userProfile.about || 'No introduction provided yet.';

    // 3. Populate Editable Inputs
    if (inputFullName) inputFullName.value = userProfile.name;
    if (inputEmail) inputEmail.value = userProfile.email;
    if (inputPhone) inputPhone.value = userProfile.phone || '';
    if (inputLocation) inputLocation.value = userProfile.location || '';
    if (inputJobTitle) inputJobTitle.value = userProfile.role || '';
    if (inputDepartment) inputDepartment.value = userProfile.department || '';
    if (inputAbout) inputAbout.value = userProfile.about || '';
    updateCharCounter();

    // 4. Work Details
    if (workTeamVal) workTeamVal.textContent = (userProfile.department || 'Product & Design') + ' Team';

    // 5. Header User Profile Trigger (Top Right)
    const headerUserName = document.getElementById('headerUserName');
    const headerUserRole = document.getElementById('headerUserRole');
    const headerAvatarInitials = document.getElementById('headerAvatarInitials');
    if (headerUserName) headerUserName.textContent = userProfile.name;
    if (headerUserRole) headerUserRole.textContent = userProfile.role;
    if (headerAvatarInitials) headerAvatarInitials.textContent = userProfile.initials;

    // Header Profile Dropdown
    const headerMenuName = document.getElementById('headerMenuName');
    const headerMenuEmail = document.getElementById('headerMenuEmail');
    const headerMenuAvatar = document.getElementById('headerMenuAvatar');
    const headerMenuStatus = document.getElementById('headerMenuStatus');
    if (headerMenuName) headerMenuName.textContent = userProfile.name;
    if (headerMenuEmail) headerMenuEmail.textContent = userProfile.email;
    if (headerMenuAvatar) headerMenuAvatar.textContent = userProfile.initials;
    if (headerMenuStatus) headerMenuStatus.textContent = `Active • ${userProfile.role}`;

    // 6. Sidebar Profile Pill (Bottom Left)
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const sidebarName = document.getElementById('sidebarUserName');
    const sidebarRole = document.getElementById('sidebarUserRole');
    if (sidebarAvatar) sidebarAvatar.textContent = userProfile.initials;
    if (sidebarName) sidebarName.textContent = userProfile.name;
    if (sidebarRole) sidebarRole.textContent = userProfile.role;

    // Sidebar Profile Dropdown
    const profileMenuName = document.getElementById('profileMenuName');
    const profileMenuEmail = document.getElementById('profileMenuEmail');
    const profileMenuAvatar = document.getElementById('profileMenuAvatar');
    const profileMenuStatus = document.getElementById('profileMenuStatus');
    if (profileMenuName) profileMenuName.textContent = userProfile.name;
    if (profileMenuEmail) profileMenuEmail.textContent = userProfile.email;
    if (profileMenuAvatar) profileMenuAvatar.textContent = userProfile.initials;
    if (profileMenuStatus) profileMenuStatus.textContent = `Active • ${userProfile.role}`;

    // 7. Workspace info
    const savedWs = localStorage.getItem(STORAGE_KEY_WORKSPACE) || 'Team Workspace';
    const currentWorkspaceName = document.getElementById('currentWorkspaceName');
    const currentWorkspaceAvatar = document.getElementById('currentWorkspaceAvatar');
    if (currentWorkspaceName) currentWorkspaceName.textContent = savedWs;
    if (currentWorkspaceAvatar) currentWorkspaceAvatar.textContent = savedWs.charAt(0).toUpperCase();
    if (workActiveWorkspace) workActiveWorkspace.textContent = `${savedWs} (Pro Plan)`;
  }

  function renderTaskStatistics() {
    if (taskStatTotal) taskStatTotal.textContent = taskStats.total;
    if (taskStatProgress) taskStatProgress.textContent = taskStats.inProgress;
    if (taskStatCompleted) taskStatCompleted.textContent = taskStats.completed;
    if (taskStatOverdue) taskStatOverdue.textContent = taskStats.overdue;

    const ratio = taskStats.total > 0
      ? Math.round((taskStats.completed / taskStats.total) * 100)
      : 0;

    if (completionRatioText) completionRatioText.textContent = `${ratio}%`;
    if (progressFillBar) progressFillBar.style.width = `${ratio}%`;
    if (progressSubCaption) {
      progressSubCaption.textContent = `${taskStats.completed} of ${taskStats.total} tasks completed`;
    }

    // Overview tile numbers
    const overviewAssigned = document.getElementById('overviewAssignedTasks');
    const overviewCompleted = document.getElementById('overviewCompletedTasks');
    if (overviewAssigned) overviewAssigned.textContent = taskStats.total;
    if (overviewCompleted) overviewCompleted.textContent = taskStats.completed;
  }

  // Initial renders
  renderProfileView();
  renderTaskStatistics();

  // =========================================================================
  // 4. View Mode vs Edit Mode Transitions
  // =========================================================================

  function enterEditMode() {
    isEditMode = true;

    // Hide view text displays, show editable inputs
    document.querySelectorAll('.view-val-display').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.form-field-editable').forEach(el => el.style.display = 'block');

    // Update buttons & labels
    if (toggleEditBtnText) toggleEditBtnText.textContent = 'Save Changes';
    if (cancelEditHeaderBtn) cancelEditHeaderBtn.style.display = 'inline-flex';
    if (bottomActionsBar) bottomActionsBar.style.display = 'flex';
    if (aboutCharCounter) aboutCharCounter.style.display = 'block';

    if (modeIndicatorPill) {
      modeIndicatorPill.textContent = 'Editing';
      modeIndicatorPill.classList.add('editing');
    }

    // Clear previous error states
    clearValidationErrors();

    // Focus first input
    if (inputFullName) {
      setTimeout(() => inputFullName.focus(), 80);
    }
  }

  function exitEditMode() {
    isEditMode = false;

    // Show view text displays, hide editable inputs
    document.querySelectorAll('.view-val-display').forEach(el => el.style.display = 'flex');
    if (viewAbout) viewAbout.style.display = 'block';
    document.querySelectorAll('.form-field-editable').forEach(el => el.style.display = 'none');

    // Update buttons & labels
    if (toggleEditBtnText) toggleEditBtnText.textContent = 'Edit Profile';
    if (cancelEditHeaderBtn) cancelEditHeaderBtn.style.display = 'none';
    if (bottomActionsBar) bottomActionsBar.style.display = 'none';
    if (aboutCharCounter) aboutCharCounter.style.display = 'none';

    if (modeIndicatorPill) {
      modeIndicatorPill.textContent = 'View Mode';
      modeIndicatorPill.classList.remove('editing');
    }

    clearValidationErrors();
  }

  function hasUnsavedChanges() {
    if (!isEditMode) return false;
    return (
      (inputFullName && inputFullName.value.trim() !== userProfile.name) ||
      (inputEmail && inputEmail.value.trim() !== userProfile.email) ||
      (inputPhone && inputPhone.value.trim() !== (userProfile.phone || '')) ||
      (inputLocation && inputLocation.value.trim() !== (userProfile.location || '')) ||
      (inputJobTitle && inputJobTitle.value.trim() !== (userProfile.role || '')) ||
      (inputDepartment && inputDepartment.value.trim() !== (userProfile.department || '')) ||
      (inputAbout && inputAbout.value.trim() !== (userProfile.about || ''))
    );
  }

  function attemptCancelEdit() {
    if (hasUnsavedChanges()) {
      if (discardModalBackdrop) discardModalBackdrop.classList.add('show');
    } else {
      exitEditMode();
    }
  }

  // Toggle button click (Header)
  if (toggleEditModeBtn) {
    toggleEditModeBtn.addEventListener('click', () => {
      if (!isEditMode) {
        enterEditMode();
      } else {
        // Trigger submit
        if (profileForm) {
          profileForm.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      }
    });
  }

  // Quick edit from dropdown
  const menuEditProfileQuick = document.getElementById('menuEditProfileQuick');
  if (menuEditProfileQuick) {
    menuEditProfileQuick.addEventListener('click', () => {
      closeAllDropdowns();
      enterEditMode();
    });
  }

  if (cancelEditHeaderBtn) cancelEditHeaderBtn.addEventListener('click', attemptCancelEdit);
  if (cancelEditBottomBtn) cancelEditBottomBtn.addEventListener('click', attemptCancelEdit);
  if (discardChangesBtn) discardChangesBtn.addEventListener('click', attemptCancelEdit);

  // Discard Modal Controls
  if (keepEditingBtn && discardModalBackdrop) {
    keepEditingBtn.addEventListener('click', () => {
      discardModalBackdrop.classList.remove('show');
    });
  }

  if (confirmDiscardBtn && discardModalBackdrop) {
    confirmDiscardBtn.addEventListener('click', () => {
      discardModalBackdrop.classList.remove('show');
      renderProfileView(); // restores values
      exitEditMode();
      showToast('Changes discarded', 'info');
    });
  }

  // Live character counter for About Me
  function updateCharCounter() {
    if (inputAbout && aboutCharCounter) {
      const len = inputAbout.value.length;
      aboutCharCounter.textContent = `${len}/300`;
      if (len >= 300) {
        aboutCharCounter.style.color = '#DC2626';
      } else {
        aboutCharCounter.style.color = '';
      }
    }
  }

  if (inputAbout) {
    inputAbout.addEventListener('input', updateCharCounter);
  }

  // =========================================================================
  // 5. Form Validation & Profile Save
  // =========================================================================

  function clearValidationErrors() {
    [errFullName, errEmail, errPhone].forEach(err => {
      if (err) err.style.display = 'none';
    });
    [inputFullName, inputEmail, inputPhone].forEach(inp => {
      if (inp) inp.classList.remove('is-invalid');
    });
  }

  function validateProfileForm() {
    let isValid = true;
    clearValidationErrors();

    // 1. Full Name
    const nameVal = inputFullName ? inputFullName.value.trim() : '';
    if (!nameVal || nameVal.length < 2) {
      if (errFullName) errFullName.style.display = 'block';
      if (inputFullName) inputFullName.classList.add('is-invalid');
      isValid = false;
    }

    // 2. Email Address
    const emailVal = inputEmail ? inputEmail.value.trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailRegex.test(emailVal)) {
      if (errEmail) errEmail.style.display = 'block';
      if (inputEmail) inputEmail.classList.add('is-invalid');
      isValid = false;
    }

    // 3. Phone (Optional, but if filled, must have digits)
    const phoneVal = inputPhone ? inputPhone.value.trim() : '';
    if (phoneVal && phoneVal.length < 7) {
      if (errPhone) errPhone.style.display = 'block';
      if (inputPhone) inputPhone.classList.add('is-invalid');
      isValid = false;
    }

    return isValid;
  }

  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!validateProfileForm()) {
        showToast('Please resolve the highlighted field errors.', 'error');
        return;
      }

      // Prepare updated model
      const updatedProfile = {
        name: inputFullName.value.trim(),
        email: inputEmail.value.trim(),
        phone: inputPhone.value.trim(),
        location: inputLocation.value.trim(),
        role: inputJobTitle.value.trim() || 'Product Lead',
        department: inputDepartment.value.trim() || 'Product & Design',
        about: inputAbout.value.trim()
      };

      // Loading state on save button
      if (saveProfileBtn) {
        saveProfileBtn.disabled = true;
        const btnText = document.getElementById('saveProfileBtnText');
        if (btnText) btnText.textContent = 'Saving...';
      }

      // Save to backend API
      try {
        if (typeof TaskFlowAPI !== 'undefined' && TaskFlowAPI.isAuthenticated()) {
          await TaskFlowAPI.updateProfile({
            display_name: updatedProfile.name,
            job_title: updatedProfile.role,
            bio: updatedProfile.about,
            department: updatedProfile.department,
            phone: updatedProfile.phone,
            location: updatedProfile.location
          });
        }
        userProfile = Object.assign(userProfile, updatedProfile);
        updateInitials();
        saveProfileToStorage();

        renderProfileView();
        exitEditMode();
        showToast('Profile information updated successfully!', 'success');
      } catch (err) {
        console.error('Failed to update profile:', err);
        showToast('Error saving profile: ' + (err.message || 'Error'), 'error');
      } finally {
        if (saveProfileBtn) {
          saveProfileBtn.disabled = false;
          const btnText = document.getElementById('saveProfileBtnText');
          if (btnText) btnText.textContent = 'Save Changes';
        }
      }
    });
  }

  // =========================================================================
  // 6. Profile Picture Editor & File Upload
  // =========================================================================

  function openAvatarModal() {
    stagedAvatarDataUrl = null;
    if (avatarFileError) avatarFileError.style.display = 'none';

    // Show current avatar in modal preview
    if (userAvatarDataUrl) {
      if (modalPreviewImg) {
        modalPreviewImg.src = userAvatarDataUrl;
        modalPreviewImg.style.display = 'block';
      }
      if (modalPreviewInitials) modalPreviewInitials.style.display = 'none';
      if (removeAvatarPhotoBtn) removeAvatarPhotoBtn.style.display = 'block';
    } else {
      if (modalPreviewImg) modalPreviewImg.style.display = 'none';
      if (modalPreviewInitials) {
        modalPreviewInitials.textContent = userProfile.initials;
        modalPreviewInitials.style.display = 'block';
      }
      if (removeAvatarPhotoBtn) removeAvatarPhotoBtn.style.display = 'none';
    }

    if (avatarModalBackdrop) avatarModalBackdrop.classList.add('show');
  }

  function closeAvatarModal() {
    if (avatarModalBackdrop) avatarModalBackdrop.classList.remove('show');
    stagedAvatarDataUrl = null;
  }

  if (openAvatarModalBtn) openAvatarModalBtn.addEventListener('click', openAvatarModal);
  if (closeAvatarModalBtn) closeAvatarModalBtn.addEventListener('click', closeAvatarModal);
  if (cancelAvatarModalBtn) cancelAvatarModalBtn.addEventListener('click', closeAvatarModal);

  // Trigger File Input from Dropzone
  if (uploadDropzone && avatarFileInput) {
    uploadDropzone.addEventListener('click', () => {
      avatarFileInput.click();
    });

    uploadDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadDropzone.classList.add('dragover');
    });

    uploadDropzone.addEventListener('dragleave', () => {
      uploadDropzone.classList.remove('dragover');
    });

    uploadDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processSelectedImageFile(e.dataTransfer.files[0]);
      }
    });
  }

  if (avatarFileInput) {
    avatarFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        processSelectedImageFile(e.target.files[0]);
      }
    });
  }

  function processSelectedImageFile(file) {
    if (avatarFileError) avatarFileError.style.display = 'none';

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showAvatarFileError('Unsupported file format. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    // Validate size (5 MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showAvatarFileError('File size exceeds the 5 MB limit. Please select a smaller photo.');
      return;
    }

    // Read and stage preview
    const reader = new FileReader();
    reader.onload = (event) => {
      stagedAvatarDataUrl = event.target.result;

      if (modalPreviewImg) {
        modalPreviewImg.src = stagedAvatarDataUrl;
        modalPreviewImg.style.display = 'block';
      }
      if (modalPreviewInitials) modalPreviewInitials.style.display = 'none';
      if (removeAvatarPhotoBtn) removeAvatarPhotoBtn.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  function showAvatarFileError(msg) {
    if (avatarFileError) {
      avatarFileError.textContent = msg;
      avatarFileError.style.display = 'block';
    }
  }

  // Save Staged Avatar
  if (saveAvatarPhotoBtn) {
    saveAvatarPhotoBtn.addEventListener('click', () => {
      if (stagedAvatarDataUrl) {
        userAvatarDataUrl = stagedAvatarDataUrl;
        try {
          localStorage.setItem(STORAGE_KEY_AVATAR, userAvatarDataUrl);
        } catch (e) {
          console.warn('Could not persist avatar to localStorage', e);
        }
        renderProfileView();
        closeAvatarModal();
        showToast('Profile photo updated successfully!', 'success');
      } else {
        closeAvatarModal();
      }
    });
  }

  // Remove Photo Action
  if (removeAvatarPhotoBtn) {
    removeAvatarPhotoBtn.addEventListener('click', () => {
      userAvatarDataUrl = null;
      stagedAvatarDataUrl = null;
      try {
        localStorage.removeItem(STORAGE_KEY_AVATAR);
      } catch (e) {}

      renderProfileView();
      closeAvatarModal();
      showToast('Profile photo removed. Restored standard avatar initials.', 'info');
    });
  }

  // =========================================================================
  // 7. Dropdowns & Global Interactions
  // =========================================================================

  function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
    const wsBtn = document.getElementById('workspaceBtn');
    if (wsBtn) wsBtn.setAttribute('aria-expanded', 'false');
    const headerAvBtn = document.getElementById('headerAvatarBtn');
    if (headerAvBtn) headerAvBtn.setAttribute('aria-expanded', 'false');
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) profileBtn.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-menu') &&
        !e.target.closest('.workspace-selector-btn') &&
        !e.target.closest('.user-profile-btn') &&
        !e.target.closest('.header-profile-btn') &&
        !e.target.closest('.header-icon-btn')) {
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
        const currentWorkspaceName = document.getElementById('currentWorkspaceName');
        const currentWorkspaceAvatar = document.getElementById('currentWorkspaceAvatar');
        if (currentWorkspaceName) currentWorkspaceName.textContent = wsName;
        if (currentWorkspaceAvatar) currentWorkspaceAvatar.textContent = wsName.charAt(0).toUpperCase();
        if (workActiveWorkspace) workActiveWorkspace.textContent = `${wsName} (Pro Plan)`;

        localStorage.setItem(STORAGE_KEY_WORKSPACE, wsName);

        workspaceDropdown.querySelectorAll('.ws-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        closeAllDropdowns();
        showToast(`Switched workspace to ${wsName}`, 'success');
      });
    });
  }

  // Sidebar Profile Dropdown
  const profileBtn = document.getElementById('profileBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isShow = profileDropdown.classList.contains('show');
      closeAllDropdowns();
      if (!isShow) {
        profileDropdown.classList.add('show');
        profileBtn.setAttribute('aria-expanded', 'true');
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
      const currentWorkspaceName = document.getElementById('currentWorkspaceName');
      const currentWorkspaceAvatar = document.getElementById('currentWorkspaceAvatar');
      if (currentWorkspaceName) currentWorkspaceName.textContent = wsName;
      if (currentWorkspaceAvatar) currentWorkspaceAvatar.textContent = wsName.charAt(0).toUpperCase();
      if (workActiveWorkspace) workActiveWorkspace.textContent = `${wsName} (Pro Plan)`;
      localStorage.setItem(STORAGE_KEY_WORKSPACE, wsName);

      if (createWorkspaceModalBackdrop) createWorkspaceModalBackdrop.classList.remove('show');
      showToast(`Created workspace: ${wsName}`, 'success');
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
    } else if (e.key === 'Escape') {
      closeAllDropdowns();
      if (avatarModalBackdrop) avatarModalBackdrop.classList.remove('show');
      if (discardModalBackdrop) discardModalBackdrop.classList.remove('show');
      if (createWorkspaceModalBackdrop) createWorkspaceModalBackdrop.classList.remove('show');
      closeMobileSidebar();
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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Real backend sync
  async function fetchProfileFromAPI() {
    if (typeof TaskFlowAPI === 'undefined' || !TaskFlowAPI.isAuthenticated()) return;
    try {
      const user = await TaskFlowAPI.getProfile();
      if (user) {
        userProfile.name = user.full_name || user.email;
        userProfile.email = user.email;
        userProfile.role = user.job_title || user.role || 'Product Lead';
        userProfile.about = user.bio || '';
        if (user.avatar) {
          userAvatarDataUrl = user.avatar;
        }
        updateInitials();
        saveProfileToStorage();
        renderProfileView();
      }
      const summary = await TaskFlowAPI.getDashboardSummary();
      if (summary) {
        taskStats.total = summary.my_tasks_count || 0;
        taskStats.inProgress = summary.in_progress_tasks || 0;
        taskStats.completed = summary.completed_tasks || 0;
        taskStats.overdue = summary.overdue_tasks || 0;
        renderTaskStats();
      }
    } catch (e) {
      console.warn('Could not fetch user profile from API:', e);
    }
  }

  fetchProfileFromAPI();

  if (window.TaskFlowWS) {
    TaskFlowWS.onNotification(() => {
      fetchProfileFromAPI();
    });
  }
});
