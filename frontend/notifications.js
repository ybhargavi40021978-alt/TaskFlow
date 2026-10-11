/**
 * TaskFlow — Interface 9: Notifications Page
 * Complete Vanilla JavaScript Application Logic
 * 
 * Features:
 * - Dynamic Notification State & Date Grouping (Today, Yesterday, Earlier)
 * - Real-time Metric Cards (All, Unread, Today) & Filter Badges
 * - Multi-criteria Filtering (Tabs: All, Unread, Mentions, Tasks, Projects)
 * - In-feed Search with instant filtering & Sort order (Newest/Oldest)
 * - Contextual Navigation (View task, Open project, Open conversation)
 * - Three-dot Action Menu (Toggle Read/Unread, Open Related, Delete)
 * - Mark All as Read with live badge updates
 * - Notification Settings Modal with in-app/email preference switches
 * - Delete Confirmation Modal
 * - Global Search & Ctrl+K Shortcut
 * - Toast feedback alerts
 * - LocalStorage persistence for user interactions
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. Constants & Initial Seed Data
  // =========================================================================
  const NOTIFS_STORAGE_KEY = 'taskflow_notifications_v2';
  const PREFS_STORAGE_KEY = 'taskflow_notification_prefs_v2';
  
  // Anchor date for consistent interface demo experience: Oct 11, 2026
  const TODAY_STR = '2026-10-11';
  const YESTERDAY_STR = '2026-10-10';

  const SEED_NOTIFICATIONS = [];

  // Application State
  const state = {
    notifications: [],
    activeTab: 'all', // 'all' | 'unread' | 'mentions' | 'tasks' | 'projects'
    summaryCardFilter: null, // null | 'all' | 'unread' | 'today'
    searchQuery: '',
    sortOrder: 'newest', // 'newest' | 'oldest'
    deleteTargetId: null,
    preferences: {
      task_assigned_inapp: true,
      task_assigned_email: true,
      status_change_inapp: true,
      status_change_email: false,
      comments_inapp: true,
      comments_email: true,
      mentions_inapp: true,
      mentions_email: true,
      project_inapp: true,
      project_email: false,
      deadlines_inapp: true,
      deadlines_email: true,
      messages_inapp: true,
      messages_email: false
    }
  };

  // =========================================================================
  // 2. Storage & State Synchronization
  // =========================================================================
  function loadData() {
    try {
      const storedPrefs = localStorage.getItem(PREFS_STORAGE_KEY);
      if (storedPrefs) {
        state.preferences = { ...state.preferences, ...JSON.parse(storedPrefs) };
      }
    } catch (e) {
      console.warn('LocalStorage error or unavailable:', e);
    }
    state.notifications = [];
  }

  function saveNotifications() {
    try {
      localStorage.setItem(NOTIFS_STORAGE_KEY, JSON.stringify(state.notifications));
    } catch (e) {
      console.warn('Failed to save notifications to localStorage:', e);
    }
  }

  function savePreferences() {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(state.preferences));
    } catch (e) {
      console.warn('Failed to save preferences to localStorage:', e);
    }
  }

  // =========================================================================
  // 3. Filtering & Sorting Logic
  // =========================================================================
  function getFilteredNotifications() {
    return state.notifications.filter(item => {
      // 1. Text Search query (actor, entityName, project, message)
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const matchesPlain = item.plainText.toLowerCase().includes(q);
        const matchesProject = (item.project || '').toLowerCase().includes(q);
        const matchesActor = item.actor.toLowerCase().includes(q);
        if (!matchesPlain && !matchesProject && !matchesActor) {
          return false;
        }
      }

      // 2. Summary Card Filter
      if (state.summaryCardFilter) {
        if (state.summaryCardFilter === 'unread' && !item.isUnread) return false;
        if (state.summaryCardFilter === 'today' && item.dateGroup !== 'today') return false;
      }

      // 3. Tab Filter
      if (state.activeTab === 'unread') {
        if (!item.isUnread) return false;
      } else if (state.activeTab === 'mentions') {
        if (item.type !== 'mentions') return false;
      } else if (state.activeTab === 'tasks') {
        if (item.type !== 'tasks') return false;
      } else if (state.activeTab === 'projects') {
        if (item.type !== 'projects') return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort Order
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return state.sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }

  // =========================================================================
  // 4. Metric Calculations & UI Badges
  // =========================================================================
  function updateMetricsAndBadges() {
    const totalCount = state.notifications.length;
    const unreadCount = state.notifications.filter(n => n.isUnread).length;
    const todayCount = state.notifications.filter(n => n.dateGroup === 'today').length;
    const mentionsCount = state.notifications.filter(n => n.type === 'mentions').length;
    const tasksCount = state.notifications.filter(n => n.type === 'tasks').length;
    const projectsCount = state.notifications.filter(n => n.type === 'projects').length;

    // Summary Cards
    const countAllEl = document.getElementById('countAllNotifs');
    const countUnreadEl = document.getElementById('countUnreadNotifs');
    const countTodayEl = document.getElementById('countTodayNotifs');

    if (countAllEl) countAllEl.textContent = String(totalCount).padStart(2, '0');
    if (countUnreadEl) countUnreadEl.textContent = String(unreadCount).padStart(2, '0');
    if (countTodayEl) countTodayEl.textContent = String(todayCount).padStart(2, '0');

    // Tab Badges
    const badgeAll = document.getElementById('badgeAll');
    const badgeUnread = document.getElementById('badgeUnread');
    const badgeMentions = document.getElementById('badgeMentions');
    const badgeTasks = document.getElementById('badgeTasks');
    const badgeProjects = document.getElementById('badgeProjects');

    if (badgeAll) badgeAll.textContent = totalCount;
    if (badgeUnread) badgeUnread.textContent = unreadCount;
    if (badgeMentions) badgeMentions.textContent = mentionsCount;
    if (badgeTasks) badgeTasks.textContent = tasksCount;
    if (badgeProjects) badgeProjects.textContent = projectsCount;

    // Header Bell Badge
    const headerNotifBadge = document.getElementById('headerNotifBadge');
    if (headerNotifBadge) {
      headerNotifBadge.style.display = unreadCount > 0 ? 'block' : 'none';
    }

    // Update active state on summary cards
    document.querySelectorAll('.summary-card').forEach(card => {
      const cardType = card.dataset.summaryFilter;
      if (state.summaryCardFilter && state.summaryCardFilter === cardType) {
        card.classList.add('active-filter');
      } else {
        card.classList.remove('active-filter');
      }
    });
  }

  // =========================================================================
  // 5. Notification Feed Rendering
  // =========================================================================
  function renderFeed() {
    const container = document.getElementById('feedScrollContainer');
    const emptyState = document.getElementById('feedEmptyState');
    if (!container || !emptyState) return;

    container.innerHTML = '';

    const list = getFilteredNotifications();

    if (list.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'flex';
      renderEmptyState(emptyState);
      return;
    }

    container.style.display = 'flex';
    emptyState.style.display = 'none';

    // Group items by dateGroup
    const groups = [
      { key: 'today', label: 'Today', items: [] },
      { key: 'yesterday', label: 'Yesterday', items: [] },
      { key: 'earlier', label: 'Earlier', items: [] }
    ];

    list.forEach(item => {
      const g = groups.find(group => group.key === item.dateGroup) || groups[2];
      g.items.push(item);
    });

    groups.forEach(group => {
      if (group.items.length === 0) return;

      const groupEl = document.createElement('div');
      groupEl.className = 'feed-group';

      // Group Header
      const headerEl = document.createElement('div');
      headerEl.className = 'feed-group-header';
      headerEl.innerHTML = `
        <span>${group.label}</span>
        <span class="group-count-badge">${group.items.length}</span>
      `;
      groupEl.appendChild(headerEl);

      // Group Rows
      group.items.forEach(notif => {
        const row = createNotificationRow(notif);
        groupEl.appendChild(row);
      });

      container.appendChild(groupEl);
    });
  }

  function createNotificationRow(notif) {
    const row = document.createElement('div');
    row.className = `notification-row ${notif.isUnread ? 'is-unread' : ''}`;
    row.dataset.id = notif.id;

    // SVG icon for category badge
    let categoryIconSvg = '';
    if (notif.badgeIcon === 'check') {
      categoryIconSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (notif.badgeIcon === 'at') {
      categoryIconSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="4"></circle><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path></svg>`;
    } else if (notif.badgeIcon === 'clock') {
      categoryIconSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    } else if (notif.badgeIcon === 'flag') {
      categoryIconSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>`;
    } else if (notif.badgeIcon === 'message') {
      categoryIconSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
    } else {
      categoryIconSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`;
    }

    row.innerHTML = `
      <div class="row-unread-marker" aria-hidden="true"></div>
      
      <div class="row-avatar-badge">
        <div class="notif-avatar ${notif.avatarClass}">${notif.actorInitials}</div>
        <div class="category-icon-badge ${notif.categoryBadge}">${categoryIconSvg}</div>
      </div>

      <div class="row-content">
        <div class="row-message">${notif.message}</div>
        <div class="row-meta-line">
          <span class="notif-timestamp">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${notif.timeDisplay}
          </span>
          ${notif.project ? `<span class="notif-tag tag-project">${notif.project}</span>` : ''}
          <span class="notif-tag tag-type-${notif.type}">${notif.type.toUpperCase()}</span>
        </div>
      </div>

      <div class="row-actions-group">
        <button class="btn-contextual-action" data-url="${notif.targetUrl}">
          ${notif.actionLabel}
        </button>

        <div class="row-more-menu-wrap">
          <button class="btn-row-more" aria-label="Notification actions" aria-expanded="false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
          </button>
          <div class="row-dropdown-menu">
            <button class="row-dropdown-item toggle-read-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>${notif.isUnread ? 'Mark as read' : 'Mark as unread'}</span>
            </button>
            <button class="row-dropdown-item open-item-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              <span>Open related item</span>
            </button>
            <div class="dropdown-divider"></div>
            <button class="row-dropdown-item item-danger delete-notif-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Delete notification</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Row click: mark read and navigate
    const contextualBtn = row.querySelector('.btn-contextual-action');
    contextualBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      markNotificationRead(notif.id, true);
      window.location.href = notif.targetUrl;
    });

    // Three-dot menu button toggle
    const moreBtn = row.querySelector('.btn-row-more');
    const menuDropdown = row.querySelector('.row-dropdown-menu');

    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other open row menus
      document.querySelectorAll('.row-dropdown-menu.is-open').forEach(m => {
        if (m !== menuDropdown) m.classList.remove('is-open');
      });
      menuDropdown.classList.toggle('is-open');
    });

    // Toggle Read/Unread
    const toggleReadBtn = row.querySelector('.toggle-read-btn');
    toggleReadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.classList.remove('is-open');
      markNotificationRead(notif.id, !notif.isUnread);
      showToast(notif.isUnread ? 'Marked as read' : 'Marked as unread');
    });

    // Open Related Item
    const openItemBtn = row.querySelector('.open-item-btn');
    openItemBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      markNotificationRead(notif.id, true);
      window.location.href = notif.targetUrl;
    });

    // Delete Trigger
    const deleteBtn = row.querySelector('.delete-notif-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.classList.remove('is-open');
      openDeleteConfirmModal(notif.id);
    });

    // Clicking anywhere on row marks read
    row.addEventListener('click', (e) => {
      if (!e.target.closest('.row-actions-group')) {
        if (notif.isUnread) {
          markNotificationRead(notif.id, true);
        }
      }
    });

    return row;
  }

  // =========================================================================
  // 6. Empty State Views
  // =========================================================================
  function renderEmptyState(container) {
    let heading = "You're all caught up!";
    let subtext = "New activity from your team will appear here.";

    if (state.activeTab === 'unread') {
      heading = "No unread notifications";
      subtext = "You've reviewed all your recent updates.";
    } else if (state.searchQuery || state.activeTab !== 'all') {
      heading = "No notifications found";
      subtext = "Try another filter or clear your search to see more activity.";
    }

    container.innerHTML = `
      <div class="empty-icon-circle">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      </div>
      <h3 class="empty-heading">${heading}</h3>
      <p class="empty-subtext">${subtext}</p>
      ${(state.searchQuery || state.activeTab !== 'all' || state.summaryCardFilter) ? `
        <button class="btn-empty-reset" id="resetEmptyFilterBtn">
          <span>View all notifications</span>
        </button>
      ` : ''}
    `;

    const resetBtn = document.getElementById('resetEmptyFilterBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.searchQuery = '';
        state.activeTab = 'all';
        state.summaryCardFilter = null;
        
        const feedInput = document.getElementById('feedSearchInput');
        if (feedInput) feedInput.value = '';

        document.querySelectorAll('.filter-tab-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.filter === 'all');
        });

        updateUI();
      });
    }
  }

  // =========================================================================
  // 7. Notification Actions (Mark Read, Mark All, Delete)
  // =========================================================================
  function markNotificationRead(id, isRead) {
    const item = state.notifications.find(n => n.id == id);
    if (item) {
      item.isUnread = !isRead; // isUnread = false if isRead is true
      saveNotifications();
      updateUI();
    }
    if (typeof TaskFlowAPI !== 'undefined' && Number.isInteger(Number(id))) {
      TaskFlowAPI.markNotificationRead(id).catch(err => console.error(err));
    }
  }

  function markAllAsRead() {
    state.notifications.forEach(n => {
      n.isUnread = false;
    });
    saveNotifications();
    updateUI();
    showToast('All notifications marked as read');

    if (typeof TaskFlowAPI !== 'undefined') {
      TaskFlowAPI.markAllNotificationsRead().catch(err => console.error(err));
    }
  }

  function openDeleteConfirmModal(id) {
    state.deleteTargetId = id;
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeDeleteConfirmModal() {
    state.deleteTargetId = null;
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function executeDeleteNotification() {
    if (!state.deleteTargetId) return;
    const targetId = state.deleteTargetId;
    state.notifications = state.notifications.filter(n => n.id !== targetId);
    state.deleteTargetId = null;

    saveNotifications();
    closeDeleteConfirmModal();
    updateUI();
    showToast('Notification deleted');

    if (typeof TaskFlowAPI !== 'undefined' && Number.isInteger(Number(targetId))) {
      TaskFlowAPI.deleteNotification(targetId).catch(err => console.error('Failed to delete notification:', err));
    }
  }

  // =========================================================================
  // 8. Notification Settings Modal
  // =========================================================================
  function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;

    // Load saved preferences into checkboxes
    Object.keys(state.preferences).forEach(key => {
      const input = document.getElementById(`pref_${key}`);
      if (input) {
        input.checked = !!state.preferences[key];
      }
    });

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function handleSettingsSubmit(e) {
    e.preventDefault();

    // Read form values
    Object.keys(state.preferences).forEach(key => {
      const input = document.getElementById(`pref_${key}`);
      if (input) {
        state.preferences[key] = input.checked;
      }
    });

    savePreferences();
    closeSettingsModal();
    showToast('Notification preferences saved successfully');
  }

  // =========================================================================
  // 9. Toast Alerts Feedback
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
  // 10. Global Search & Ctrl+K Shortcut
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

      const matches = state.notifications.filter(item => {
        return (
          item.plainText.toLowerCase().includes(q) ||
          item.actor.toLowerCase().includes(q) ||
          (item.project && item.project.toLowerCase().includes(q))
        );
      }).slice(0, 5);

      if (matches.length === 0) {
        list.innerHTML = '<div class="search-result-item" style="color: var(--color-muted);">No matching notifications found</div>';
      } else {
        list.innerHTML = '';
        matches.forEach(item => {
          const res = document.createElement('div');
          res.className = 'search-result-item';
          res.innerHTML = `
            <div class="search-item-title">${item.plainText}</div>
            <div class="search-item-meta">${item.timeDisplay} • ${item.project || 'General'}</div>
          `;
          res.addEventListener('click', () => {
            dropdown.classList.remove('is-open');
            input.value = '';
            markNotificationRead(item.id, true);
            window.location.href = item.targetUrl;
          });
          list.appendChild(res);
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
  // 11. Event Listeners Setup
  // =========================================================================
  function setupEventListeners() {
    // 1. Mark All As Read
    const markAllBtn = document.getElementById('markAllReadBtn');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', markAllAsRead);
    }

    // 2. Settings Modal Triggers
    const openSettingsBtn = document.getElementById('openSettingsModalBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsModalBtn');
    const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    const settingsForm = document.getElementById('settingsForm');

    if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettingsModal);
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsModal);
    if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', closeSettingsModal);
    if (settingsForm) settingsForm.addEventListener('submit', handleSettingsSubmit);

    // 3. Delete Confirmation Modal Triggers
    const closeDeleteBtn = document.getElementById('closeDeleteModalBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    if (closeDeleteBtn) closeDeleteBtn.addEventListener('click', closeDeleteConfirmModal);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteConfirmModal);
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', executeDeleteNotification);

    // 4. Summary Card Click Filters
    document.querySelectorAll('.summary-card').forEach(card => {
      card.addEventListener('click', () => {
        const type = card.dataset.summaryFilter;
        if (state.summaryCardFilter === type) {
          state.summaryCardFilter = null; // Toggle off
        } else {
          state.summaryCardFilter = type; // Activate filter
        }
        updateUI();
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });

    // 5. Filter Tabs
    document.querySelectorAll('.filter-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.filter;
        state.activeTab = tab;

        document.querySelectorAll('.filter-tab-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });

        updateUI();
      });
    });

    // 6. In-Feed Search & Clear
    const feedSearchInput = document.getElementById('feedSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    if (feedSearchInput) {
      feedSearchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        if (clearSearchBtn) {
          clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
        }
        renderFeed();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        state.searchQuery = '';
        if (feedSearchInput) feedSearchInput.value = '';
        clearSearchBtn.style.display = 'none';
        renderFeed();
      });
    }

    // 7. Sort Dropdown
    const sortSelect = document.getElementById('feedSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.sortOrder = e.target.value;
        renderFeed();
      });
    }

    // 8. Refresh Button
    const refreshBtn = document.getElementById('refreshFeedBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('is-spinning');
        setTimeout(() => {
          refreshBtn.classList.remove('is-spinning');
          updateUI();
          showToast('Notifications refreshed');
        }, 500);
      });
    }

    // 9. Workspace Selector Dropdown
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

    // 10. Profile Dropdown
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

    // 11. Help Dropdown
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

    // 12. Mobile Sidebar Drawer
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

    // 13. Global Document Click: Close Menus
    document.addEventListener('click', () => {
      if (workspaceDropdown) workspaceDropdown.classList.remove('is-open');
      if (profileDropdown) profileDropdown.classList.remove('is-open');
      if (helpDropdown) helpDropdown.classList.remove('is-open');
      document.querySelectorAll('.row-dropdown-menu.is-open').forEach(m => m.classList.remove('is-open'));
    });

    // 14. Global Keyboard Shortcuts (Escape, A for All, U for Unread)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSettingsModal();
        closeDeleteConfirmModal();
        closeMobileSidebar();
        if (workspaceDropdown) workspaceDropdown.classList.remove('is-open');
        if (profileDropdown) profileDropdown.classList.remove('is-open');
        if (helpDropdown) helpDropdown.classList.remove('is-open');
        document.querySelectorAll('.row-dropdown-menu.is-open').forEach(m => m.classList.remove('is-open'));
      }

      // Ignore when typing inside input
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key.toLowerCase() === 'a') {
        const tabAll = document.getElementById('tabAll');
        if (tabAll) tabAll.click();
      } else if (e.key.toLowerCase() === 'u') {
        const tabUnread = document.getElementById('tabUnread');
        if (tabUnread) tabUnread.click();
      }
    });
  }

  // =========================================================================
  // 12. Master UI Update
  // =========================================================================
  function updateUI() {
    updateMetricsAndBadges();
    renderFeed();
  }

  // =========================================================================
  // 13. Initialization & Real-Time Sync
  // =========================================================================
  async function fetchNotificationsFromAPI() {
    if (typeof TaskFlowAPI === 'undefined' || !TaskFlowAPI.isAuthenticated()) return;
    try {
      const res = await TaskFlowAPI.getNotifications();
      const serverNotifs = Array.isArray(res) ? res : (res && res.results ? res.results : []);
      const now = new Date();
      const todayDateStr = now.toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      state.notifications = serverNotifs.map(n => {
        let badgeIcon = 'check';
        let categoryBadge = 'badge-task';
        let type = 'tasks';
        const nType = (n.notification_type || '').toLowerCase();

        if (nType.includes('comment') || nType.includes('mention')) {
          badgeIcon = 'message';
          categoryBadge = 'badge-comment';
          type = 'mentions';
        } else if (nType.includes('project')) {
          badgeIcon = 'flag';
          categoryBadge = 'badge-project';
          type = 'projects';
        } else if (nType.includes('deadline')) {
          badgeIcon = 'clock';
          categoryBadge = 'badge-deadline';
          type = 'tasks';
        }

        let targetUrl = 'dashboard.html';
        if (n.related_task) targetUrl = `task-details.html?id=${n.related_task}`;
        else if (n.related_project) targetUrl = `project-details.html?id=${n.related_project}`;

        const createdDate = new Date(n.created_at);
        const createdDateStr = isNaN(createdDate.getTime()) ? todayDateStr : createdDate.toISOString().split('T')[0];
        let dateGroup = 'earlier';
        if (createdDateStr === todayDateStr) dateGroup = 'today';
        else if (createdDateStr === yesterday) dateGroup = 'yesterday';

        const actorName = n.actor ? (n.actor.full_name || n.actor.email) : 'TaskFlow System';
        const actorInitials = n.actor ? (n.actor.initials || 'TF') : 'TF';

        return {
          id: n.id,
          actor: actorName,
          actorInitials: actorInitials,
          avatarClass: 'av-alex',
          type: type,
          categoryBadge: categoryBadge,
          badgeIcon: badgeIcon,
          message: n.message,
          plainText: (n.message || '').replace(/<[^>]*>/g, ''),
          entityName: n.related_task_title || n.related_project_name || 'Activity',
          entityType: n.related_task ? 'task' : 'project',
          project: n.related_project_name || '',
          actionLabel: n.related_task ? 'View task' : (n.related_project ? 'Open project' : 'Open dashboard'),
          targetUrl: targetUrl,
          timestamp: n.created_at,
          timeDisplay: isNaN(createdDate.getTime()) ? 'Just now' : createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateGroup: dateGroup,
          isUnread: !n.is_read
        };
      });
      saveNotifications();
      updateUI();
    } catch (err) {
      console.warn('Could not fetch notifications from backend:', err);
    }
  }

  async function init() {
    if (typeof TaskFlowAPI !== 'undefined' && !TaskFlowAPI.requireAuth()) return;
    loadData();
    setupEventListeners();
    setupGlobalSearch();
    updateUI();
    await fetchNotificationsFromAPI();

    if (window.TaskFlowWS) {
      TaskFlowWS.onNotification(() => {
        fetchNotificationsFromAPI();
      });
      TaskFlowWS.onReconnect(() => {
        fetchNotificationsFromAPI();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
